import { getAddress, getNetworkDetails, isConnected, requestAccess, signTransaction } from '@stellar/freighter-api'
import { Preferences } from '@capacitor/preferences'

// El SDK de Stellar solo se carga si se usa la wallet del dispositivo (mantiene liviana la web)
const sdk = () => import('@stellar/stellar-sdk')

// Dos formas de firmar:
//  · Freighter (extensión del navegador de escritorio): la wallet propia del turista, opción A de la v3.
//  · Wallet de prueba en el dispositivo (app móvil): una cuenta de TESTNET creada o importada en la app.
//    La clave queda en el almacenamiento de la app; sirve para la demo, no para dinero real.
// En desarrollo, las pruebas automáticas pueden inyectar window.__tilcagoTestWallet = { address, network, sign(xdr) }.
const testWallet = () => (import.meta.env.DEV && typeof window !== 'undefined' ? window.__tilcagoTestWallet : null)

export const FREIGHTER_URL = 'https://www.freighter.app/'
export const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015'
const HORIZON_URL = 'https://horizon-testnet.stellar.org'
// Cada app (turista / cajero) guarda su propia wallet: en el mismo navegador no se pisan
const deviceKey = (app) => `tilcago.wallet.testnet.${app}`

export class WalletError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

// ---------- Wallet de prueba en el dispositivo ----------

const deviceSecretCache = {}

async function deviceSecret(app) {
  if (deviceSecretCache[app] !== undefined) return deviceSecretCache[app]
  const { value } = await Preferences.get({ key: deviceKey(app) }).catch(() => ({ value: null }))
  if (!value) return (deviceSecretCache[app] = null)
  const { StrKey } = await sdk()
  deviceSecretCache[app] = StrKey.isValidEd25519SecretSeed(value) ? value : null
  return deviceSecretCache[app]
}

async function saveDeviceSecret(app, secret) {
  deviceSecretCache[app] = secret
  if (secret) await Preferences.set({ key: deviceKey(app), value: secret })
  else await Preferences.remove({ key: deviceKey(app) })
}

/**
 * Agrega la trustline al activo si todavía no está. `firmar(xdr)` devuelve el XDR firmado:
 * con la clave del dispositivo o con Freighter. Si la cuenta no existe en testnet, la fondea con Friendbot.
 */
async function ensureTrustline(address, assetLine, firmar) {
  const { Asset, BASE_FEE, Horizon, Operation, TransactionBuilder } = await sdk()
  const horizon = new Horizon.Server(HORIZON_URL)
  let account
  try {
    account = await horizon.loadAccount(address)
  } catch {
    const res = await fetch(`https://friendbot.stellar.org/?addr=${address}`)
    if (!res.ok) throw new WalletError('friendbot', 'Friendbot no respondió; intenta de nuevo en unos segundos')
    account = await horizon.loadAccount(address)
  }
  const [code, issuer] = assetLine.split(':')
  if (account.balances.some((b) => b.asset_code === code && b.asset_issuer === issuer)) return
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: TESTNET_PASSPHRASE })
    .addOperation(Operation.changeTrust({ asset: new Asset(code, issuer) }))
    .setTimeout(120)
    .build()
  const signed = await firmar(tx.toXDR())
  await horizon.submitTransaction(TransactionBuilder.fromXDR(signed, TESTNET_PASSPHRASE))
}

async function firmarConClave(secret) {
  const { Keypair, TransactionBuilder } = await sdk()
  const kp = Keypair.fromSecret(secret)
  return { address: kp.publicKey(), firmar: async (xdr) => {
    const tx = TransactionBuilder.fromXDR(xdr, TESTNET_PASSPHRASE)
    tx.sign(kp)
    return tx.toXDR()
  } }
}

/** Agrega la trustline del activo a la wallet en uso (dispositivo o Freighter). */
export async function addTrustline(app, address, assetLine) {
  const secret = await deviceSecret(app)
  if (secret) {
    const { firmar } = await firmarConClave(secret)
    return ensureTrustline(address, assetLine, firmar)
  }
  return ensureTrustline(address, assetLine, (xdr) => signXdr(app, xdr, TESTNET_PASSPHRASE, address))
}

/** Crea una cuenta de testnet en el dispositivo, la fondea con Friendbot y agrega la trustline. */
export async function createDeviceWallet(app, assetLine) {
  const { Keypair } = await sdk()
  const kp = Keypair.random()
  const { firmar } = await firmarConClave(kp.secret())
  await ensureTrustline(kp.publicKey(), assetLine, firmar)
  await saveDeviceSecret(app, kp.secret())
  return kp.publicKey()
}

/** Importa una clave secreta de TESTNET (por ejemplo, una cuenta del seed de la demo). */
export async function importDeviceWallet(app, secret, assetLine) {
  const { StrKey } = await sdk()
  const s = secret.trim()
  if (!StrKey.isValidEd25519SecretSeed(s)) throw new WalletError('bad_secret', 'La clave no es válida (empieza con S y tiene 56 caracteres)')
  const { address, firmar } = await firmarConClave(s)
  await ensureTrustline(address, assetLine, firmar)
  await saveDeviceSecret(app, s)
  return address
}

export async function forgetDeviceWallet(app) {
  await saveDeviceSecret(app, null)
}

// ---------- API común ----------

/** Estado de la wallet sin pedir permisos: tipo, dirección y red. */
export async function walletStatus(app) {
  const test = testWallet()
  if (test) return { kind: 'test', installed: true, address: test.address, passphrase: test.network ?? TESTNET_PASSPHRASE }
  const secret = await deviceSecret(app)
  if (secret) {
    const { Keypair } = await sdk()
    return { kind: 'device', installed: true, address: Keypair.fromSecret(secret).publicKey(), passphrase: TESTNET_PASSPHRASE }
  }
  const conn = await isConnected().catch(() => ({ isConnected: false }))
  if (!conn.isConnected) return { kind: null, installed: false, address: null, passphrase: null }
  const [addr, net] = await Promise.all([getAddress().catch(() => ({})), getNetworkDetails().catch(() => ({}))])
  return { kind: 'freighter', installed: true, address: addr.address || null, passphrase: net.networkPassphrase ?? null }
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
export async function signXdr(app, xdr, passphrase, address) {
  const test = testWallet()
  if (test) return test.sign(xdr)
  const secret = await deviceSecret(app)
  if (secret) {
    const { Keypair, TransactionBuilder } = await sdk()
    const kp = Keypair.fromSecret(secret)
    if (kp.publicKey() !== address) throw new WalletError('wrong_account', 'La wallet de este dispositivo no es la de la orden')
    const tx = TransactionBuilder.fromXDR(xdr, passphrase)
    tx.sign(kp)
    return tx.toXDR()
  }
  const res = await signTransaction(xdr, { networkPassphrase: passphrase, address })
  if (res.error || !res.signedTxXdr) throw new WalletError('rejected', 'La firma se canceló en la wallet')
  return res.signedTxXdr
}

/** Saldo de XLM y del USDC configurado (por emisor, no solo por código), desde Horizon de testnet. */
export async function walletBalances(address, asset) {
  const res = await fetch(`${HORIZON_URL}/accounts/${address}`)
  if (res.status === 404) return { exists: false, xlm: 0, usdc: null }
  if (!res.ok) throw new WalletError('horizon', 'No se pudo leer el saldo')
  const data = await res.json()
  const [code, issuer] = asset.split(':')
  const line = data.balances.find((b) => b.asset_code === code && b.asset_issuer === issuer)
  const xlm = data.balances.find((b) => b.asset_type === 'native')
  return { exists: true, xlm: Number(xlm?.balance ?? 0), usdc: line ? Number(line.balance) : null }
}

export const shortAddress = (a) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '')
