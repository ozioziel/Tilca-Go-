import { getAddress, getNetworkDetails, isConnected, requestAccess, signTransaction } from '@stellar/freighter-api'

// Integración con Freighter. En desarrollo, las pruebas automáticas pueden inyectar
// window.__tilcagoTestWallet = { address, network, sign(xdr) } para no depender de la extensión.
const testWallet = () => (import.meta.env.DEV && typeof window !== 'undefined' ? window.__tilcagoTestWallet : null)

export const FREIGHTER_URL = 'https://www.freighter.app/'
export const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015'

export class WalletError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

/** Estado de la wallet sin pedir permisos: instalada, dirección (si ya autorizó) y red. */
export async function walletStatus() {
  const test = testWallet()
  if (test) return { installed: true, address: test.address, passphrase: test.network ?? TESTNET_PASSPHRASE }
  const conn = await isConnected().catch(() => ({ isConnected: false }))
  if (!conn.isConnected) return { installed: false, address: null, passphrase: null }
  const [addr, net] = await Promise.all([getAddress().catch(() => ({})), getNetworkDetails().catch(() => ({}))])
  return { installed: true, address: addr.address || null, passphrase: net.networkPassphrase ?? null }
}

/** Pide acceso a Freighter (abre su ventana) y devuelve la dirección. */
export async function connectWallet() {
  const test = testWallet()
  if (test) return test.address
  const conn = await isConnected().catch(() => ({ isConnected: false }))
  if (!conn.isConnected) throw new WalletError('not_installed', 'Instala Freighter para continuar')
  const res = await requestAccess()
  if (res.error || !res.address) throw new WalletError('denied', 'No se dio acceso a la wallet')
  return res.address
}

/** Firma una transacción con la cuenta `address`. Devuelve el XDR firmado. */
export async function signXdr(xdr, passphrase, address) {
  const test = testWallet()
  if (test) return test.sign(xdr)
  const res = await signTransaction(xdr, { networkPassphrase: passphrase, address })
  if (res.error || !res.signedTxXdr) throw new WalletError('rejected', 'La firma se canceló en la wallet')
  return res.signedTxXdr
}

/** Saldo de XLM y del USDC configurado (por emisor, no solo por código), desde Horizon de testnet. */
export async function walletBalances(address, asset) {
  const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`)
  if (res.status === 404) return { exists: false, xlm: 0, usdc: null }
  if (!res.ok) throw new WalletError('horizon', 'No se pudo leer el saldo')
  const data = await res.json()
  const [code, issuer] = asset.split(':')
  const line = data.balances.find((b) => b.asset_code === code && b.asset_issuer === issuer)
  const xlm = data.balances.find((b) => b.asset_type === 'native')
  return { exists: true, xlm: Number(xlm?.balance ?? 0), usdc: line ? Number(line.balance) : null }
}

export const shortAddress = (a) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '')
