import { Account, Asset, Contract, Keypair, Networks, Operation, TransactionBuilder, xdr } from '@stellar/stellar-sdk'
import { describe, expect, it } from 'vitest'
import { inspectSponsoredTx } from '../src/stellar/sponsor'

const PASS = Networks.TESTNET
const user = Keypair.random()
const ESCROW = 'CBVMFSWZNP3LA6YDD5GVOBFIYOVECU6IVWCQU7TKJBA3VE5DVYJUE5O6'
const OTHER = 'CDL6QDKD744APSO4HYIEJDB32GTEO2SFUHG2NOE34MB3C5Y4SGZ2EKTM'
const orderId = xdr.ScVal.scvBytes(Buffer.alloc(32, 7))

function build(ops: xdr.Operation[], { fee = '100', timeout = 300, sign = true } = {}) {
  const b = new TransactionBuilder(new Account(user.publicKey(), '1'), { fee, networkPassphrase: PASS })
  ops.forEach((op) => b.addOperation(op))
  const tx = b.setTimeout(timeout).build()
  if (sign) tx.sign(user)
  return tx.toXDR()
}

const call = (fn: string, contract = ESCROW, args = [orderId]) => new Contract(contract).call(fn, ...args)
const inspect = (x: string) => inspectSponsoredTx(x, PASS, ESCROW, 2_000_000)

describe('patrocinio de gas', () => {
  it('acepta una llamada permitida al escrow y extrae el order_id', () => {
    const r = inspect(build([call('release')]))
    expect(r.fn).toBe('release')
    expect(r.source).toBe(user.publicKey())
    expect(r.contractOrderId).toBe('07'.repeat(32))
  })

  it('rechaza funciones que no se patrocinan', () => {
    expect(() => inspect(build([call('set_fee_bps')]))).toThrow(/no se patrocina/)
    expect(() => inspect(build([call('upgrade')]))).toThrow(/no se patrocina/)
  })

  it('rechaza otros contratos', () => {
    expect(() => inspect(build([call('transfer', OTHER)]))).toThrow(/contrato de TilcaGo/)
  })

  it('rechaza pagos clásicos y varias operaciones', () => {
    const pay = Operation.payment({ destination: Keypair.random().publicKey(), asset: Asset.native(), amount: '1' })
    expect(() => inspect(build([pay]))).toThrow(/llamadas al contrato/)
    expect(() => inspect(build([call('release'), call('release')]))).toThrow(/una sola operación/)
  })

  it('rechaza sin firma, con comisión excesiva o sin vencimiento cercano', () => {
    expect(() => inspect(build([call('release')], { sign: false }))).toThrow(/firma/)
    expect(() => inspect(build([call('release')], { fee: '5000000' }))).toThrow(/tope/)
    expect(() => inspect(build([call('release')], { timeout: 3_600 }))).toThrow(/20 minutos/)
  })

  it('exige el order_id de 32 bytes como primer argumento', () => {
    const bad = xdr.ScVal.scvBytes(Buffer.alloc(8))
    expect(() => inspect(build([call('release', ESCROW, [bad])]))).toThrow(/order_id/)
  })
})
