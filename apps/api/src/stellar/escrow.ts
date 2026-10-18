import { Account, Address, BASE_FEE, Contract, nativeToScVal, rpc, TransactionBuilder, xdr } from '@stellar/stellar-sdk'
import { config } from '../config'
import { HttpError } from '../lib/errors'

export const server = new rpc.Server(config.STELLAR_RPC_URL, { allowHttp: config.STELLAR_RPC_URL.startsWith('http://') })
export const escrow = new Contract(config.ESCROW_CONTRACT_ID)

/** Reintenta fallas de red pasajeras hacia Stellar RPC; si persisten, responde 503. */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn()
    } catch (err) {
      const network = err instanceof Error && /fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|503|502/i.test(`${err.message} ${(err as { code?: string }).code ?? ''}`)
      if (!network) throw err
      if (i >= attempts) throw new HttpError(503, 'stellar_unavailable', 'Stellar RPC no responde; intenta de nuevo en unos segundos')
      await new Promise((r) => setTimeout(r, 400 * i))
    }
  }
}

export const scv = {
  bytes32: (hex: string) => xdr.ScVal.scvBytes(Buffer.from(hex, 'hex')),
  address: (a: string) => new Address(a).toScVal(),
  i128: (v: bigint) => nativeToScVal(v, { type: 'i128' }),
  u64: (v: bigint | number) => nativeToScVal(BigInt(v), { type: 'u64' }),
}

/**
 * Arma y simula una invocación del escrow con `source` como cuenta origen, lista
 * para que la wallet la firme. `validUntil` limita hasta cuándo la red la acepta
 * (así un depósito no puede entrar después de que venció la cotización).
 */
export async function buildEscrowCall(source: string, fn: string, args: xdr.ScVal[], validUntil: Date): Promise<string> {
  const account = await withRetry(() => server.getAccount(source))
  const seconds = Math.max(30, Math.floor((validUntil.getTime() - Date.now()) / 1000))
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: config.STELLAR_NETWORK_PASSPHRASE })
    .addOperation(escrow.call(fn, ...args))
    .setTimeout(Math.min(seconds, 15 * 60))
    .build()
  const prepared = await withRetry(() => server.prepareTransaction(tx))
  return prepared.toXDR()
}

/** Lee una función de solo lectura del contrato (simulación, sin enviar nada). */
export async function readContract(contractId: string, fn: string, args: xdr.ScVal[]): Promise<xdr.ScVal | null> {
  // Cualquier cuenta sirve como origen de una simulación
  const source = new Account(config.PLATFORM_FEE_ADDRESS, '0')
  const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: config.STELLAR_NETWORK_PASSPHRASE })
    .addOperation(new Contract(contractId).call(fn, ...args))
    .setTimeout(30)
    .build()
  const sim = await withRetry(() => server.simulateTransaction(tx))
  if (rpc.Api.isSimulationError(sim)) return null
  return sim.result?.retval ?? null
}

/**
 * true si la cuenta puede recibir el USDC configurado. El SAC falla al consultar
 * el saldo de una cuenta G sin trustline, así que la simulación basta.
 */
export async function hasUsdcTrustline(address: string): Promise<boolean> {
  return (await readContract(config.USDC_SAC_ID, 'balance', [scv.address(address)])) !== null
}
