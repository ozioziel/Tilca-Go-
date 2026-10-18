/**
 * Recorre de punta a punta el flujo de la v3 contra el API y Stellar Testnet,
 * firmando con las claves de prueba como lo haría Freighter:
 *
 *   cotizar → crear orden → depositar (gas patrocinado) → código de retiro →
 *   el cajero valida el código → start_handover → (el reembolso queda bloqueado) → release
 *
 * Uso: npm run demo   (con el API corriendo: npm run dev)
 */
import { config as loadEnv } from 'dotenv'
import { Horizon, Keypair, Networks, TransactionBuilder } from '@stellar/stellar-sdk'

loadEnv({ path: '.env.demo' })
const API = process.env.API_URL ?? 'http://localhost:4000'
const horizon = new Horizon.Server('https://horizon-testnet.stellar.org')

const tourist = Keypair.fromSecret(process.env.TURISTA_1_SECRET!)
const agentKey = Keypair.fromSecret(process.env.CAJERO_1_SECRET!)

async function api<T = any>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw Object.assign(new Error(`${method} ${path} → ${res.status} ${data.error}: ${data.message}`), { status: res.status, data })
  return data
}

async function login(email: string) {
  const { devCode } = await api('POST', '/auth/otp/request', { email })
  const { token } = await api('POST', '/auth/otp/verify', { email, code: devCode })
  return token as string
}

/** Pide la transacción al API, la firma con la clave (como Freighter) y la envía con gas patrocinado. */
async function signAndSubmit(token: string, orderId: string, action: string, key: Keypair) {
  const { xdr } = await api('POST', `/orders/${orderId}/tx/${action}`, {}, token)
  const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET)
  tx.sign(key)
  const res = await api('POST', '/tx/submit', { xdr: tx.toXDR() }, token)
  console.log(`  ✓ ${action.padEnd(15)} ${res.order.status.padEnd(16)} ${res.url}`)
  return res
}

async function xlm(address: string) {
  const acc = await horizon.loadAccount(address)
  return acc.balances.find((b) => b.asset_type === 'native')!.balance
}

const step = (s: string) => console.log(`\n▸ ${s}`)

step('Sesiones (OTP de demo)')
const touristToken = await login('ana@tilcago.test')
const agentToken = await login('rosa@tilcago.test')
console.log('  turista y cajera con sesión')

step('Cotización pública')
const quote = await api('GET', '/quotes?amount_usdc=100')
console.log(`  100 USDC → Bs ${quote.net_bob} (tasa ${quote.rate_applied_bob}, comisión ${quote.fee_usdc} USDC, red: ${quote.network_fee})`)

step('Cajeros cercanos')
const { agents } = await api('GET', '/agents')
const agent = agents.find((a: any) => a.name === 'Sagárnaga Cambios') ?? agents[0]
console.log(`  ${agent.name} · ${agent.distance_m} m · Bs ${agent.cash_available_bob} disponibles`)

step('Crear orden (reserva atómica del efectivo)')
const { order } = await api('POST', '/orders', { quote_id: quote.id, agent_id: agent.id, wallet_address: tourist.publicKey() }, touristToken)
console.log(`  orden ${order.id} · ${order.status} · entrega Bs ${order.net_bob}`)

step('Depósito al escrow con gas patrocinado')
const xlmBefore = await xlm(tourist.publicKey())
await signAndSubmit(touristToken, order.id, 'deposit', tourist)
const xlmAfter = await xlm(tourist.publicKey())
console.log(`  XLM del turista: ${xlmBefore} → ${xlmAfter} ${xlmBefore === xlmAfter ? '(no pagó comisión de red)' : '(¡cambió!)'}`)

step('Código de retiro')
const code = await api('POST', `/orders/${order.id}/withdrawal-code`, {}, touristToken)
console.log(`  código ${code.code} · PIN ${code.pin}`)

step('La cajera valida el código (un solo uso)')
await api('POST', '/withdrawals/verify', { code: code.code }, agentToken)
console.log('  ✓ código consumido')
try {
  await api('POST', '/withdrawals/verify', { code: code.code }, agentToken)
  console.log('  ✗ el código se pudo usar dos veces')
} catch {
  console.log('  ✓ reusar el código falla')
}

step('Mostrador: la cajera inicia la entrega')
await signAndSubmit(agentToken, order.id, 'start_handover', agentKey)

step('El turista ya no puede pedir reembolso')
try {
  await api('POST', `/orders/${order.id}/tx/refund`, {}, touristToken)
  console.log('  ✗ el API ofreció un reembolso durante la entrega')
} catch (e: any) {
  console.log(`  ✓ rechazado: ${e.data?.message}`)
}

step('El turista firma la liberación frente al efectivo contado')
const done = await signAndSubmit(touristToken, order.id, 'release', tourist)
console.log(`  estado final: ${done.order.status}`)

console.log('\nTransacciones:')
for (const t of done.order.transactions) console.log(`  ${t.kind.padEnd(15)} ${t.url}`)
