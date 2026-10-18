import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { config } from '../config'
import { pool, type Db } from '../db/pool'
import { computeQuote, formatBob, formatUsdc, parseRateE4, parseUsdc } from '../lib/money'

/** Tasa de referencia vigente. En el MVP la fija el admin; luego vendrá de fuentes de mercado (v3 §6.2). */
export async function currentRate(db: Db = pool): Promise<{ id: string; source: string; rateRefE4: bigint; fetchedAt: Date }> {
  const { rows } = await db.query<{ id: string; source: string; rate_ref_e4: bigint; fetched_at: Date }>(
    'SELECT id, source, rate_ref_e4, fetched_at FROM rate_snapshots ORDER BY fetched_at DESC LIMIT 1',
  )
  if (rows[0]) return { id: rows[0].id, source: rows[0].source, rateRefE4: rows[0].rate_ref_e4, fetchedAt: rows[0].fetched_at }
  const rateRefE4 = parseRateE4(config.RATE_REF_BOB)
  const ins = await db.query<{ id: string; fetched_at: Date }>(
    `INSERT INTO rate_snapshots (source, rate_ref_e4) VALUES ('env:RATE_REF_BOB', $1) RETURNING id, fetched_at`,
    [rateRefE4],
  )
  return { id: ins.rows[0].id, source: 'env:RATE_REF_BOB', rateRefE4, fetchedAt: ins.rows[0].fetched_at }
}

export interface QuoteRow {
  id: string
  gross_usdc: bigint
  rate_ref_e4: bigint
  margin_bps: number
  rate_applied_e4: bigint
  fee_bps: number
  fee_platform_bps: number
  fee_usdc: bigint
  net_usdc: bigint
  net_bob_cents: bigint
  expires_at: Date
}

export function presentQuote(q: QuoteRow) {
  const rate = (e4: bigint) => `${e4 / 10_000n}.${(e4 % 10_000n).toString().padStart(4, '0')}`
  return {
    id: q.id,
    amount_usdc: formatUsdc(q.gross_usdc, 7),
    rate_ref_bob: rate(q.rate_ref_e4),
    margin_bps: q.margin_bps,
    rate_applied_bob: rate(q.rate_applied_e4),
    fee_bps: q.fee_bps,
    fee_usdc: formatUsdc(q.fee_usdc, 7),
    net_bob: formatBob(q.net_bob_cents),
    network_fee: 'sponsored',
    expires_at: q.expires_at,
  }
}

export async function quoteRoutes(app: FastifyInstance) {
  // Público: se puede cotizar sin cuenta (v3 §4 paso 1-2)
  app.get('/quotes', async (req) => {
    const { amount_usdc } = z.object({ amount_usdc: z.string() }).parse(req.query)
    const gross = parseUsdc(amount_usdc)
    const rate = await currentRate()
    const m = computeQuote(gross, rate.rateRefE4, config.MARGIN_BPS, config.FEE_BPS_TOTAL)
    const { rows } = await pool.query<QuoteRow>(
      `INSERT INTO quotes (rate_snapshot_id, gross_usdc, rate_ref_e4, margin_bps, rate_applied_e4, fee_bps, fee_platform_bps,
                           fee_usdc, net_usdc, net_bob_cents, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now() + make_interval(mins => $11))
       RETURNING *`,
      [rate.id, m.grossUsdc, m.rateRefE4, m.marginBps, m.rateAppliedE4, m.feeBps, config.FEE_BPS_PLATFORM, m.feeUsdc, m.netUsdc, m.netBobCents, config.QUOTE_TTL_MIN],
    )
    return {
      ...presentQuote(rows[0]),
      rate_source: rate.source,
      rate_fetched_at: rate.fetchedAt,
      breakdown_bob: {
        reference: formatBob(m.refBobCents),
        margin: formatBob(m.marginBobCents),
        fee: formatBob(m.feeBobCents),
        cash: formatBob(m.netBobCents),
      },
    }
  })
}
