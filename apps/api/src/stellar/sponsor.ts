import { Address, FeeBumpTransaction, Keypair, rpc, scValToNative, Transaction, TransactionBuilder, xdr } from '@stellar/stellar-sdk'
import { badRequest } from '../lib/errors'

/** Funciones del escrow cuyo gas patrocina TilcaGo, y quién debe firmarlas. */
export const SPONSORED: Record<string, 'tourist' | 'agent' | 'party'> = {
  deposit: 'tourist',
  release: 'tourist',
  refund: 'tourist',
  start_handover: 'agent',
  cancel_handover: 'agent',
  agent_refund: 'agent',
  open_dispute: 'party',
}

export interface EscrowCall {
  tx: Transaction
  source: string
  fn: string
  contractOrderId: string
  args: xdr.ScVal[]
}

/**
 * Valida una transacción firmada por el usuario antes de pagarle el gas.
 * Solo se patrocina una única invocación al escrow, de una función permitida,
 * con comisión acotada y firmada. Cualquier otra cosa se rechaza.
 */
export function inspectSponsoredTx(envelopeXdr: string, passphrase: string, escrowId: string, maxFeeStroops: number): EscrowCall {
  let parsed: Transaction | FeeBumpTransaction
  try {
    parsed = TransactionBuilder.fromXDR(envelopeXdr, passphrase)
  } catch {
    throw badRequest('invalid_xdr', 'La transacción no se puede leer')
  }
  if (parsed instanceof FeeBumpTransaction) throw badRequest('fee_bump_not_allowed', 'Envía la transacción sin fee-bump')
  const tx = parsed
  if (tx.operations.length !== 1) throw badRequest('one_operation', 'La transacción debe tener una sola operación')
  const op = tx.operations[0]
  if (op.type !== 'invokeHostFunction') throw badRequest('not_contract_call', 'Solo se patrocinan llamadas al contrato')
  if (op.func.type !== 'hostFunctionTypeInvokeContract') {
    throw badRequest('not_contract_call', 'Solo se patrocinan llamadas al contrato')
  }
  const call = op.func.invokeContract
  const contractId = Address.fromScAddress(call.contractAddress).toString()
  if (contractId !== escrowId) throw badRequest('wrong_contract', 'La llamada no es al contrato de TilcaGo')
  const fn = call.functionName.toString()
  if (!(fn in SPONSORED)) throw badRequest('fn_not_sponsored', `La función ${fn} no se patrocina`)
  if (Number(tx.fee) > maxFeeStroops) throw badRequest('fee_too_high', 'La comisión de la transacción supera el tope')
  if (tx.signatures.length === 0) throw badRequest('unsigned', 'Falta la firma de la wallet')
  const maxTime = Number(tx.timeBounds?.maxTime ?? 0)
  if (!maxTime || maxTime > Date.now() / 1000 + 20 * 60) throw badRequest('bad_timebounds', 'La transacción debe vencer en menos de 20 minutos')

  const args = call.args
  const first = args[0]
  if (!first || first.type !== 'scvBytes' || first.bytes.toBytes().length !== 32) {
    throw badRequest('bad_order_id', 'El primer argumento debe ser el order_id')
  }
  return { tx, source: tx.source, fn, contractOrderId: Buffer.from(first.bytes.toBytes()).toString('hex'), args }
}

/** Lee un argumento de la llamada como valor nativo (direcciones como G..., enteros como bigint). */
export function argNative(call: EscrowCall, i: number): unknown {
  return scValToNative(call.args[i])
}

export interface SubmitResult {
  hash: string
  status: 'SUCCESS' | 'FAILED'
  feeCharged?: bigint
  error?: string
}

/** Envuelve la transacción en un fee-bump pagado por el patrocinador, la envía y espera el resultado. */
export async function submitSponsored(
  server: rpc.Server,
  sponsor: Keypair,
  inner: Transaction,
  passphrase: string,
): Promise<SubmitResult> {
  // Tarifa de inclusión por operación del fee-bump; la de recursos de Soroban se suma sola
  const innerOps = inner.operations.length
  const sorobanResource = (() => {
    const env = inner.toEnvelope()
    if (env.type !== 'envelopeTypeTx') return 0n
    const ext = env.v1.tx.ext
    return ext.type === 'sorobanData' ? ext.sorobanData.resourceFee : 0n
  })()
  const innerInclusion = (BigInt(inner.fee) - sorobanResource) / BigInt(innerOps)
  const baseFee = innerInclusion > 200n ? innerInclusion : 200n
  const bump = TransactionBuilder.buildFeeBumpTransaction(sponsor, baseFee.toString(), inner, passphrase)
  bump.sign(sponsor)

  const sent = await server.sendTransaction(bump)
  if (sent.status === 'ERROR' || sent.status === 'TRY_AGAIN_LATER') {
    return { hash: sent.hash, status: 'FAILED', error: `${sent.status}: ${sent.errorResult?.result.type ?? 'sin detalle'}` }
  }
  const final = await server.pollTransaction(sent.hash, { attempts: 30, sleepStrategy: () => 1000 })
  if (final.status === rpc.Api.GetTransactionStatus.SUCCESS) {
    return { hash: sent.hash, status: 'SUCCESS', feeCharged: final.resultXdr.feeCharged }
  }
  const error =
    final.status === rpc.Api.GetTransactionStatus.FAILED
      ? final.resultXdr.result.type
      : 'La red no confirmó la transacción a tiempo'
  return { hash: sent.hash, status: 'FAILED', error }
}
