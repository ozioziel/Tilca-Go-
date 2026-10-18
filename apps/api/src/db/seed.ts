import { config as loadEnv } from 'dotenv'
import { Keypair } from '@stellar/stellar-sdk'
import { config } from '../config'
import { migrate } from './migrate'
import { pool } from './pool'

// Datos de la demo: cajeros activos ligados a las wallets de prueba del seed de testnet
loadEnv({ path: '.env.demo' })

const cajeros = [
  { email: 'rosa@tilcago.test', secret: process.env.CAJERO_1_SECRET, name: 'Sagárnaga Cambios', address: 'Calle Sagárnaga 213', zone: 'Centro', lat: -16.4977, lng: -68.1386, cash: 850000n, rating: 4.9 },
  { email: 'tiwanaku@tilcago.test', secret: process.env.CAJERO_2_SECRET, name: 'Minimarket Tiwanaku', address: 'Av. 20 de Octubre 1820', zone: 'Sopocachi', lat: -16.5089, lng: -68.1268, cash: 520000n, rating: 4.8 },
]

await migrate()
for (const email of config.ADMIN_EMAILS) {
  await pool.query(`INSERT INTO users (email, role) VALUES ($1, 'admin') ON CONFLICT (email) DO UPDATE SET role = 'admin'`, [email])
}
for (const c of cajeros) {
  if (!c.secret) {
    console.warn(`Sin clave para ${c.email}: corre primero scripts/seed-testnet.sh`)
    continue
  }
  const wallet = Keypair.fromSecret(c.secret).publicKey()
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO users (email, role) VALUES ($1, 'agent') ON CONFLICT (email) DO UPDATE SET role = 'agent' RETURNING id`,
    [c.email],
  )
  await pool.query(
    `INSERT INTO agents (user_id, type, display_name, address_text, zone, lat, lng, hours, wallet_address, review_status, cash_declared_cents, rating)
     VALUES ($1, 'BUSINESS', $2, $3, $4, $5, $6, 'Lun–Sáb 9:00–20:00', $7, 'ACTIVE', $8, $9)
     ON CONFLICT (user_id) DO UPDATE SET wallet_address = EXCLUDED.wallet_address, review_status = 'ACTIVE'`,
    [rows[0].id, c.name, c.address, c.zone, c.lat, c.lng, wallet, c.cash, c.rating],
  )
  console.log(`✓ ${c.name} → ${wallet}`)
}
await pool.end()
