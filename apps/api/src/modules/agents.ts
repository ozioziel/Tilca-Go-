import { StrKey } from '@stellar/stellar-sdk'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { audit, pool, tx } from '../db/pool'
import { badRequest, conflict, notFound } from '../lib/errors'
import { formatBob } from '../lib/money'
import { hasUsdcTrustline } from '../stellar/escrow'
import { requireUser } from './auth'

export const stellarAddress = z.string().refine((a) => StrKey.isValidEd25519PublicKey(a), 'Dirección Stellar inválida')
const bob = z.string().regex(/^\d{1,9}(\.\d{1,2})?$/)
export const bobToCents = (s: string) => {
  const [w, f = ''] = s.split('.')
  return BigInt(w) * 100n + BigInt(f.padEnd(2, '0'))
}

interface AgentRow {
  id: string
  display_name: string
  address_text: string
  zone: string | null
  lat: number
  lng: number
  hours: string | null
  wallet_address: string
  review_status: string
  cash_declared_cents: bigint
  cash_reserved_cents: bigint
  max_order_cents: bigint
  rating: string | null
  distance_m?: number
}

export function presentAgent(a: AgentRow, full = false) {
  const base = {
    id: a.id,
    name: a.display_name,
    address: a.address_text,
    zone: a.zone,
    lat: a.lat,
    lng: a.lng,
    hours: a.hours,
    rating: a.rating ? Number(a.rating) : null,
    cash_available_bob: formatBob(a.cash_declared_cents - a.cash_reserved_cents),
    max_order_bob: formatBob(a.max_order_cents),
    distance_m: a.distance_m === undefined ? undefined : Math.round(a.distance_m),
  }
  if (!full) return base
  return {
    ...base,
    review_status: a.review_status,
    wallet_address: a.wallet_address,
    cash_declared_bob: formatBob(a.cash_declared_cents),
    cash_reserved_bob: formatBob(a.cash_reserved_cents),
  }
}

// Distancia aproximada (haversine) sin PostGIS; suficiente para la demo
const DISTANCE_SQL = `6371000 * 2 * asin(sqrt(power(sin(radians(lat - $1) / 2), 2) + cos(radians($1)) * cos(radians(lat)) * power(sin(radians(lng - $2) / 2), 2)))`

export async function agentRoutes(app: FastifyInstance) {
  // Público: mapa de cajeros activos con efectivo disponible
  app.get('/agents', async (req) => {
    const q = z.object({ lat: z.coerce.number().default(-16.4957), lng: z.coerce.number().default(-68.1336) }).parse(req.query)
    const { rows } = await pool.query<AgentRow>(
      `SELECT *, ${DISTANCE_SQL} AS distance_m FROM agents
       WHERE review_status = 'ACTIVE' AND cash_declared_cents > cash_reserved_cents
       ORDER BY distance_m LIMIT 50`,
      [q.lat, q.lng],
    )
    return { agents: rows.map((a) => presentAgent(a)) }
  })

  // Postulación abierta: cualquiera puede postular, pero queda APPLIED hasta que operaciones la revise
  app.post('/agents/applications', async (req) => {
    const user = await requireUser(req)
    const body = z
      .object({
        type: z.enum(['PERSON', 'BUSINESS']),
        display_name: z.string().min(2).max(80),
        address_text: z.string().min(3).max(160),
        zone: z.string().max(60).optional(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        hours: z.string().max(120).optional(),
        wallet_address: stellarAddress,
        cash_declared_bob: bob,
      })
      .parse(req.body)
    const exists = await pool.query('SELECT 1 FROM agents WHERE user_id = $1', [user.id])
    if (exists.rowCount) throw conflict('already_applied', 'Ya tienes una postulación')
    const { rows } = await pool.query<AgentRow>(
      `INSERT INTO agents (user_id, type, display_name, address_text, zone, lat, lng, hours, wallet_address, cash_declared_cents)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [user.id, body.type, body.display_name, body.address_text, body.zone ?? null, body.lat, body.lng, body.hours ?? null, body.wallet_address, bobToCents(body.cash_declared_bob)],
    )
    await audit(pool, user.id, 'agent_applied', rows[0].id)
    return { agent: presentAgent(rows[0], true) }
  })

  app.get('/agents/me', async (req) => {
    const user = await requireUser(req)
    const { rows } = await pool.query<AgentRow>('SELECT * FROM agents WHERE user_id = $1', [user.id])
    if (!rows[0]) throw notFound('La postulación')
    const trustline = await hasUsdcTrustline(rows[0].wallet_address).catch(() => null)
    return { agent: presentAgent(rows[0], true), usdc_trustline_ok: trustline }
  })

  // El cajero abre/cierra su punto y actualiza el efectivo declarado (nunca por debajo de lo reservado)
  app.patch('/agents/me/availability', async (req) => {
    const user = await requireUser(req, 'agent')
    const body = z.object({ open: z.boolean().optional(), cash_declared_bob: bob.optional() }).parse(req.body)
    return tx(async (db) => {
      const { rows } = await db.query<AgentRow>('SELECT * FROM agents WHERE user_id = $1 FOR UPDATE', [user.id])
      const a = rows[0]
      if (!a) throw notFound('La postulación')
      if (body.open !== undefined) {
        if (!['ACTIVE', 'PAUSED'].includes(a.review_status)) throw badRequest('not_active', 'Tu punto todavía no está habilitado')
        await db.query('UPDATE agents SET review_status = $2, updated_at = now() WHERE id = $1', [a.id, body.open ? 'ACTIVE' : 'PAUSED'])
      }
      if (body.cash_declared_bob !== undefined) {
        const cents = bobToCents(body.cash_declared_bob)
        if (cents < a.cash_reserved_cents) throw badRequest('below_reserved', `Tienes ${formatBob(a.cash_reserved_cents)} Bs reservados en órdenes`)
        await db.query('UPDATE agents SET cash_declared_cents = $2, updated_at = now() WHERE id = $1', [a.id, cents])
      }
      await audit(db, user.id, 'agent_availability', a.id, body)
      const updated = await db.query<AgentRow>('SELECT * FROM agents WHERE id = $1', [a.id])
      return { agent: presentAgent(updated.rows[0], true) }
    })
  })
}
