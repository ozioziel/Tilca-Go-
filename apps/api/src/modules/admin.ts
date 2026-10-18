import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { config } from '../config'
import { audit, pool, tx } from '../db/pool'
import { badRequest, notFound } from '../lib/errors'
import { formatBob, formatUsdc, parseRateE4 } from '../lib/money'
import { hasUsdcTrustline } from '../stellar/escrow'
import { syncOnce } from '../stellar/sync'
import { presentAgent } from './agents'
import { requireUser } from './auth'

export async function adminRoutes(app: FastifyInstance) {
  app.get('/admin/agents/pending', async (req) => {
    await requireUser(req, 'admin')
    const { rows } = await pool.query(`SELECT * FROM agents WHERE review_status IN ('APPLIED', 'UNDER_REVIEW') ORDER BY created_at`)
    return { agents: rows.map((a) => presentAgent(a, true)) }
  })

  // Activar exige que la wallet del cajero pueda recibir el USDC configurado (si no, `release` fallaría)
  app.post('/admin/agents/:id/approve', async (req) => {
    const admin = await requireUser(req, 'admin')
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body = z.object({ max_order_bob: z.string().regex(/^\d{1,7}$/).optional(), note: z.string().max(300).optional() }).parse(req.body ?? {})
    const { rows } = await pool.query('SELECT wallet_address FROM agents WHERE id = $1', [id])
    if (!rows[0]) throw notFound('El cajero')
    if (!(await hasUsdcTrustline(rows[0].wallet_address))) {
      throw badRequest('no_trustline', `La wallet del cajero no tiene trustline a ${config.USDC_ASSET_CODE}`)
    }
    return tx(async (db) => {
      const r = await db.query(
        `UPDATE agents SET review_status = 'ACTIVE', review_note = $2, max_order_cents = COALESCE($3, max_order_cents), updated_at = now()
         WHERE id = $1 AND review_status IN ('APPLIED', 'UNDER_REVIEW', 'PAUSED') RETURNING *`,
        [id, body.note ?? null, body.max_order_bob ? BigInt(body.max_order_bob) * 100n : null],
      )
      if (!r.rows[0]) throw badRequest('bad_status', 'La postulación no está pendiente')
      await db.query(`UPDATE users SET role = 'agent' WHERE id = $1 AND role = 'tourist'`, [r.rows[0].user_id])
      await audit(db, admin.id, 'agent_approved', id, body)
      return { agent: presentAgent(r.rows[0], true) }
    })
  })

  app.post('/admin/agents/:id/reject', async (req) => {
    const admin = await requireUser(req, 'admin')
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const { note } = z.object({ note: z.string().min(3).max(300) }).parse(req.body)
    const r = await pool.query(`UPDATE agents SET review_status = 'REJECTED', review_note = $2, updated_at = now() WHERE id = $1 RETURNING *`, [id, note])
    if (!r.rows[0]) throw notFound('El cajero')
    await audit(pool, admin.id, 'agent_rejected', id, { note })
    return { agent: presentAgent(r.rows[0], true) }
  })

  app.post('/admin/agents/:id/suspend', async (req) => {
    const admin = await requireUser(req, 'admin')
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const { note } = z.object({ note: z.string().min(3).max(300) }).parse(req.body)
    const r = await pool.query(`UPDATE agents SET review_status = 'SUSPENDED', review_note = $2, updated_at = now() WHERE id = $1 RETURNING *`, [id, note])
    if (!r.rows[0]) throw notFound('El cajero')
    await audit(pool, admin.id, 'agent_suspended', id, { note })
    return { agent: presentAgent(r.rows[0], true) }
  })

  // Nueva tasa de referencia (en el MVP la carga el admin; queda registrada con su fuente)
  app.post('/admin/rate', async (req) => {
    const admin = await requireUser(req, 'admin')
    const { rate_ref_bob, source } = z.object({ rate_ref_bob: z.string(), source: z.string().min(2).max(80) }).parse(req.body)
    const e4 = parseRateE4(rate_ref_bob)
    const { rows } = await pool.query('INSERT INTO rate_snapshots (source, rate_ref_e4) VALUES ($1, $2) RETURNING id, fetched_at', [source, e4])
    await audit(pool, admin.id, 'rate_set', rows[0].id, { rate_ref_bob, source })
    return { id: rows[0].id, rate_ref_bob, source, fetched_at: rows[0].fetched_at }
  })

  app.get('/admin/orders', async (req) => {
    await requireUser(req, 'admin')
    const { status } = z.object({ status: z.string().optional() }).parse(req.query)
    const { rows } = await pool.query(
      `SELECT o.id, o.status, o.amount_usdc, o.net_bob_cents, o.created_at, a.display_name AS agent
       FROM orders o JOIN agents a ON a.id = o.agent_id
       WHERE ($1::text IS NULL OR o.status = $1) ORDER BY o.created_at DESC LIMIT 100`,
      [status ?? null],
    )
    return {
      orders: rows.map((r) => ({ ...r, amount_usdc: formatUsdc(r.amount_usdc, 7), net_bob: formatBob(r.net_bob_cents), net_bob_cents: undefined })),
    }
  })

  // Conciliación: totales del libro contable por cuenta y moneda
  app.get('/admin/reconciliation', async (req) => {
    await requireUser(req, 'admin')
    await syncOnce()
    const { rows } = await pool.query(
      `SELECT account, currency, SUM(debit) AS debit, SUM(credit) AS credit FROM ledger_entries GROUP BY account, currency ORDER BY account`,
    )
    const gas = await pool.query(`SELECT COUNT(*) AS txs, COALESCE(SUM(fee_charged), 0) AS stroops FROM chain_transactions WHERE status = 'SUCCESS'`)
    return { ledger: rows, gas_sponsored: gas.rows[0] }
  })
}
