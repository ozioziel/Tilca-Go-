import { randomUUID } from 'node:crypto'
import { Keypair, xdr } from '@stellar/stellar-sdk'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { config } from '../config'
import { audit, pool, tx } from '../db/pool'
import { contractOrderId, hashSecret, pin as newPin, sha256Hex, withdrawalCode } from '../lib/codes'
import { badRequest, conflict, forbidden, HttpError, notFound } from '../lib/errors'
import { contractSplit, formatBob, formatUsdc } from '../lib/money'
import { buildEscrowCall, hasUsdcTrustline, scv, server } from '../stellar/escrow'
import { argNative, inspectSponsoredTx, SPONSORED, submitSponsored } from '../stellar/sponsor'
import { syncUntilChanged } from '../stellar/sync'
import { stellarAddress } from './agents'
import { requireUser, type User } from './auth'

const sponsor = Keypair.fromSecret(config.GAS_SPONSOR_SECRET)
const MAX_PIN_ATTEMPTS = 5

interface OrderRow {
  id: string
  tourist_id: string
  agent_id: string
  agent_user_id: string
  agent_name: string
  agent_address: string
  status: string
  tourist_wallet: string
  agent_wallet: string
  contract_order_id: string
  amount_usdc: bigint
  net_bob_cents: bigint
  payment_deadline: Date
  expiry: Date
  handover_at: Date | null
  created_at: Date
  tourist_email: string
  fee_usdc: bigint
  fee_platform_bps: number
  rate_applied_e4: bigint
}

const ORDER_SQL = `SELECT o.*, a.user_id AS agent_user_id, a.display_name AS agent_name, a.address_text AS agent_address,
                          u.email AS tourist_email, q.fee_usdc, q.fee_platform_bps, q.rate_applied_e4
                   FROM orders o JOIN agents a ON a.id = o.agent_id JOIN users u ON u.id = o.tourist_id JOIN quotes q ON q.id = o.quote_id`

const maskEmail = (e: string) => e.replace(/^(.)(.*)(@.*)$/, (_m, a: string, b: string, c: string) => `${a}${'•'.repeat(Math.min(b.length, 6))}${c}`)

async function loadOrder(where: string, value: string): Promise<OrderRow> {
  const { rows } = await pool.query<OrderRow>(`${ORDER_SQL} WHERE ${where} = $1`, [value])
  if (!rows[0]) throw notFound('La orden')
  return rows[0]
}

function partyOf(order: OrderRow, user: User): 'tourist' | 'agent' | 'admin' {
  if (order.tourist_id === user.id) return 'tourist'
  if (order.agent_user_id === user.id) return 'agent'
  if (user.role === 'admin') return 'admin'
  throw forbidden('Esta orden no es tuya')
}

async function presentOrder(o: OrderRow) {
  const txs = await pool.query<{ kind: string; tx_hash: string; status: string; created_at: Date }>(
    'SELECT kind, tx_hash, status, created_at FROM chain_transactions WHERE order_id = $1 ORDER BY created_at',
    [o.id],
  )
  const w = await pool.query<{ status: string; expires_at: Date; redeemed_at: Date | null }>(
    'SELECT status, expires_at, redeemed_at FROM withdrawals WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
    [o.id],
  )
  const split = contractSplit(o.amount_usdc, o.fee_platform_bps)
  return {
    id: o.id,
    status: o.status,
    contract_order_id: o.contract_order_id,
    amount_usdc: formatUsdc(o.amount_usdc, 7),
    net_bob: formatBob(o.net_bob_cents),
    rate_applied_bob: `${o.rate_applied_e4 / 10_000n}.${(o.rate_applied_e4 % 10_000n).toString().padStart(4, '0')}`,
    fee_usdc: formatUsdc(o.fee_usdc, 7),
    agent_receives_usdc: formatUsdc(split.agent, 7),
    agent_fee_usdc: formatUsdc(o.fee_usdc - split.platform, 7),
    platform_fee_usdc: formatUsdc(split.platform, 7),
    tourist_email: maskEmail(o.tourist_email),
    created_at: o.created_at,
    agent: { id: o.agent_id, name: o.agent_name, address: o.agent_address, wallet: o.agent_wallet },
    tourist_wallet: o.tourist_wallet,
    payment_deadline: o.payment_deadline,
    expiry: o.expiry,
    handover_at: o.handover_at,
    withdrawal: w.rows[0] ?? null,
    transactions: txs.rows.map((t) => ({ ...t, url: `${config.STELLAR_EXPLORER}/tx/${t.tx_hash}` })),
  }
}

export async function orderRoutes(app: FastifyInstance) {
  // ---------- Crear orden: reserva atómica del efectivo del cajero ----------
  app.post('/orders', async (req) => {
    const user = await requireUser(req)
    const body = z.object({ quote_id: z.string().uuid(), agent_id: z.string().uuid(), wallet_address: stellarAddress }).parse(req.body)

    // Fuera de la transacción de BD: consulta a la red (lenta)
    if (!(await hasUsdcTrustline(body.wallet_address))) {
      throw badRequest('no_trustline', `Tu wallet no tiene ${config.USDC_ASSET_CODE} en Stellar (falta la trustline o la red no es la correcta)`)
    }

    const order = await tx(async (db) => {
      const q = await db.query<{ id: string; gross_usdc: bigint; net_bob_cents: bigint; expires_at: Date }>(
        'SELECT id, gross_usdc, net_bob_cents, expires_at FROM quotes WHERE id = $1 FOR UPDATE',
        [body.quote_id],
      )
      const quote = q.rows[0]
      if (!quote) throw notFound('La cotización')
      if (quote.expires_at.getTime() < Date.now() + 60_000) throw conflict('quote_expired', 'La cotización venció; vuelve a cotizar')
      const used = await db.query('SELECT 1 FROM orders WHERE quote_id = $1', [quote.id])
      if (used.rowCount) throw conflict('quote_used', 'Esta cotización ya tiene una orden')

      const a = await db.query<{ wallet_address: string; max_order_cents: bigint; user_id: string }>(
        `SELECT wallet_address, max_order_cents, user_id FROM agents WHERE id = $1 AND review_status = 'ACTIVE'`,
        [body.agent_id],
      )
      const agent = a.rows[0]
      if (!agent) throw notFound('El cajero')
      if (agent.user_id === user.id || agent.wallet_address === body.wallet_address) throw badRequest('same_party', 'No puedes retirar en tu propio punto')
      if (quote.net_bob_cents > agent.max_order_cents) throw badRequest('over_limit', `Este cajero entrega hasta Bs ${formatBob(agent.max_order_cents)} por orden`)

      // La restricción agents_cash_ck y esta condición impiden reservar el mismo efectivo dos veces
      const reserved = await db.query(
        `UPDATE agents SET cash_reserved_cents = cash_reserved_cents + $2, updated_at = now()
         WHERE id = $1 AND review_status = 'ACTIVE' AND cash_declared_cents - cash_reserved_cents >= $2 RETURNING id`,
        [body.agent_id, quote.net_bob_cents],
      )
      if (reserved.rowCount === 0) throw conflict('no_cash', 'El cajero ya no tiene ese efectivo disponible; elige otro')

      await db.query(
        `INSERT INTO wallets (user_id, address, network, usdc_trustline_ok) VALUES ($1, $2, 'testnet', true)
         ON CONFLICT (user_id, address) DO UPDATE SET usdc_trustline_ok = true`,
        [user.id, body.wallet_address],
      )
      const id = randomUUID()
      await db.query(
        `INSERT INTO orders (id, tourist_id, agent_id, quote_id, status, tourist_wallet, agent_wallet, contract_order_id,
                             amount_usdc, net_bob_cents, payment_deadline, expiry)
         VALUES ($1, $2, $3, $4, 'AWAITING_PAYMENT', $5, $6, $7, $8, $9, $10, now() + make_interval(mins => $11))`,
        [id, user.id, body.agent_id, quote.id, body.wallet_address, agent.wallet_address, contractOrderId(id), quote.gross_usdc, quote.net_bob_cents, quote.expires_at, config.ORDER_TTL_MIN],
      )
      await audit(db, user.id, 'order_created', id)
      return id
    })
    return { order: await presentOrder(await loadOrder('o.id', order)) }
  })

  app.get('/orders', async (req) => {
    const user = await requireUser(req)
    const { rows } = await pool.query<OrderRow>(`${ORDER_SQL} WHERE o.tourist_id = $1 OR a.user_id = $1 ORDER BY o.created_at DESC LIMIT 50`, [user.id])
    return { orders: await Promise.all(rows.map(presentOrder)) }
  })

  app.get('/orders/:id', async (req) => {
    const user = await requireUser(req)
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const o = await loadOrder('o.id', id)
    partyOf(o, user)
    return { order: await presentOrder(o) }
  })

  // ---------- Transacciones para firmar en la wallet ----------
  app.post('/orders/:id/tx/:action', async (req) => {
    const user = await requireUser(req)
    const { id, action } = z.object({ id: z.string().uuid(), action: z.enum(Object.keys(SPONSORED) as [string, ...string[]]) }).parse(req.params)
    const body = z.object({ reason: z.string().max(500).optional() }).parse(req.body ?? {})
    const o = await loadOrder('o.id', id)
    const party = partyOf(o, user)
    const need = SPONSORED[action]
    if (need !== 'party' && party !== need) throw forbidden(`Esta acción la firma el ${need === 'tourist' ? 'turista' : 'cajero'}`)
    if (need === 'party' && party === 'admin') throw forbidden('El admin abre disputas desde el panel')

    const orderId = scv.bytes32(o.contract_order_id)
    const soon = new Date(Date.now() + 5 * 60_000)
    let source: string
    let args: xdr.ScVal[] = [orderId]
    let validUntil = soon

    switch (action) {
      case 'deposit':
        if (o.status !== 'AWAITING_PAYMENT') throw conflict('bad_status', 'La orden no espera pago')
        if (o.payment_deadline.getTime() < Date.now()) throw conflict('quote_expired', 'La cotización venció')
        source = o.tourist_wallet
        args = [orderId, scv.address(o.tourist_wallet), scv.address(o.agent_wallet), scv.i128(o.amount_usdc), scv.u64(Math.floor(o.expiry.getTime() / 1000))]
        validUntil = o.payment_deadline // después de esto la red rechaza el depósito
        break
      case 'start_handover': {
        if (o.status !== 'PAID_IN_ESCROW') throw conflict('bad_status', 'La orden no está lista para entregar')
        // Requisito de la v3: el QR/PIN del turista ya fue validado y consumido
        const w = await pool.query(`SELECT 1 FROM withdrawals WHERE order_id = $1 AND status = 'REDEEMED'`, [o.id])
        if (!w.rowCount) throw conflict('code_not_verified', 'Primero valida el código de retiro del turista')
        source = o.agent_wallet
        break
      }
      case 'release':
        if (o.status !== 'IN_HANDOVER') throw conflict('bad_status', 'El cajero todavía no inició la entrega')
        source = o.tourist_wallet
        break
      case 'refund':
        if (o.status !== 'PAID_IN_ESCROW') throw conflict('bad_status', 'Solo se reembolsa una orden pagada que no está en entrega')
        if (o.expiry.getTime() > Date.now()) throw conflict('not_expired', 'La orden todavía no venció')
        source = o.tourist_wallet
        break
      case 'cancel_handover':
        if (o.status !== 'IN_HANDOVER') throw conflict('bad_status', 'La orden no está en entrega')
        source = o.agent_wallet
        break
      case 'agent_refund':
        if (!['PAID_IN_ESCROW', 'IN_HANDOVER'].includes(o.status)) throw conflict('bad_status', 'La orden no se puede devolver')
        source = o.agent_wallet
        break
      case 'open_dispute':
        if (o.status !== 'IN_HANDOVER') throw conflict('bad_status', 'Solo se abre disputa durante la entrega')
        source = party === 'tourist' ? o.tourist_wallet : o.agent_wallet
        args = [orderId, scv.address(source), scv.bytes32(sha256Hex(body.reason ?? ''))]
        break
      default:
        throw badRequest('bad_action', 'Acción desconocida')
    }

    const xdr = await buildEscrowCall(source, action, args, validUntil)
    return { xdr, network_passphrase: config.STELLAR_NETWORK_PASSPHRASE, fn: action, source, sponsored: true }
  })

  // ---------- Enviar con gas patrocinado ----------
  app.post('/tx/submit', async (req) => {
    const user = await requireUser(req)
    const { xdr } = z.object({ xdr: z.string().min(10) }).parse(req.body)
    const call = inspectSponsoredTx(xdr, config.STELLAR_NETWORK_PASSPHRASE, config.ESCROW_CONTRACT_ID, config.GAS_MAX_FEE_STROOPS)
    const o = await loadOrder('o.contract_order_id', call.contractOrderId)
    const party = partyOf(o, user)
    const need = SPONSORED[call.fn]
    if (party === 'admin' || (need !== 'party' && party !== need)) throw forbidden('No puedes enviar esta transacción')
    const expectedSource = party === 'tourist' ? o.tourist_wallet : o.agent_wallet
    if (call.source !== expectedSource) throw forbidden('La transacción no la firma la wallet de esta orden')

    if (call.fn === 'deposit') {
      // No se patrocina un depósito que no coincide con la orden
      const [, tourist, agent, amount, expiry] = [0, 1, 2, 3, 4].map((i) => argNative(call, i))
      const ok =
        tourist === o.tourist_wallet &&
        agent === o.agent_wallet &&
        amount === o.amount_usdc &&
        BigInt(expiry as bigint) === BigInt(Math.floor(o.expiry.getTime() / 1000))
      if (!ok) throw badRequest('deposit_mismatch', 'El depósito no coincide con la orden')
      if (o.status !== 'AWAITING_PAYMENT') throw conflict('bad_status', 'La orden no espera pago')
    }
    if (call.fn === 'open_dispute' && argNative(call, 1) !== call.source) throw badRequest('bad_dispute', 'La disputa debe abrirla quien firma')

    const hash = Buffer.from(call.tx.hash()).toString('hex')
    await pool.query(
      `INSERT INTO chain_transactions (order_id, tx_hash, kind, network, submitted_by, status)
       VALUES ($1, $2, $3, 'testnet', $4, 'PENDING') ON CONFLICT (tx_hash) DO NOTHING`,
      [o.id, hash, call.fn, user.id],
    )
    const result = await submitSponsored(server, sponsor, call.tx, config.STELLAR_NETWORK_PASSPHRASE)
    await pool.query(
      `UPDATE chain_transactions SET tx_hash = $2, status = $3, fee_charged = $4, error = $5,
              confirmed_at = CASE WHEN $3 = 'SUCCESS' THEN now() END
       WHERE tx_hash = $1`,
      [hash, result.hash, result.status, result.feeCharged ?? null, result.error ?? null],
    )
    await audit(pool, user.id, `tx_${call.fn}`, o.id, result)
    if (result.status !== 'SUCCESS') throw new HttpError(502, 'tx_failed', `La red rechazó la transacción: ${result.error}`)

    await syncUntilChanged(o.contract_order_id, o.status) // aplica los eventos del contrato antes de responder
    return {
      hash: result.hash,
      status: result.status,
      fee_paid_by: 'TilcaGo',
      url: `${config.STELLAR_EXPLORER}/tx/${result.hash}`,
      order: await presentOrder(await loadOrder('o.id', o.id)),
    }
  })

  // ---------- Código de retiro (QR + PIN) ----------
  // Se guardan solo hashes: cada llamada genera un código nuevo y revoca el anterior
  app.post('/orders/:id/withdrawal-code', async (req) => {
    const user = await requireUser(req)
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const o = await loadOrder('o.id', id)
    if (partyOf(o, user) !== 'tourist') throw forbidden()
    if (o.status !== 'PAID_IN_ESCROW') throw conflict('bad_status', 'El código se emite cuando el pago está protegido en el contrato')
    const code = withdrawalCode()
    const pinCode = newPin()
    await tx(async (db) => {
      await db.query(`UPDATE withdrawals SET status = 'REVOKED' WHERE order_id = $1 AND status = 'ISSUED'`, [o.id])
      await db.query('INSERT INTO withdrawals (order_id, qr_nonce_hash, pin_hash, expires_at) VALUES ($1, $2, $3, $4)', [
        o.id,
        hashSecret(code, config.CODE_PEPPER),
        hashSecret(`${o.id}:${pinCode}`, config.CODE_PEPPER),
        o.expiry,
      ])
    })
    return { code, pin: pinCode, qr_payload: `tilcago:${code}`, expires_at: o.expiry }
  })

  // El cajero valida el QR (o el PIN de la orden). Consumo atómico de un solo uso.
  app.post('/withdrawals/verify', async (req) => {
    const user = await requireUser(req, 'agent')
    const body = z
      .union([z.object({ code: z.string().min(6) }), z.object({ order_id: z.string().uuid(), pin: z.string().regex(/^\d{6}$/) })])
      .parse(req.body)

    const consumed = await tx(async (db) => {
      const byCode = 'code' in body
      const hash = byCode ? hashSecret(body.code.replace(/^tilcago:/, ''), config.CODE_PEPPER) : hashSecret(`${body.order_id}:${body.pin}`, config.CODE_PEPPER)
      const { rows } = await db.query<{ id: string; order_id: string }>(
        `UPDATE withdrawals w SET status = 'REDEEMED', redeemed_at = now()
         FROM orders o JOIN agents a ON a.id = o.agent_id
         WHERE w.order_id = o.id AND a.user_id = $1 AND w.status = 'ISSUED' AND w.expires_at > now()
           AND o.status = 'PAID_IN_ESCROW' AND ${byCode ? 'w.qr_nonce_hash' : 'w.pin_hash'} = $2
           ${byCode ? '' : 'AND o.id = $3'}
         RETURNING w.id, w.order_id`,
        byCode ? [user.id, hash] : [user.id, hash, body.order_id],
      )
      if (!rows[0] && !byCode) {
        // PIN incorrecto: se cuentan intentos y se revoca el código tras varios fallos
        await db.query(
          `UPDATE withdrawals SET failed_attempts = failed_attempts + 1,
                  status = CASE WHEN failed_attempts + 1 >= $2 THEN 'REVOKED' ELSE status END
           WHERE order_id = $1 AND status = 'ISSUED'`,
          [body.order_id, MAX_PIN_ATTEMPTS],
        )
      }
      return rows[0]
    })
    if (!consumed) throw badRequest('code_invalid', 'Código inválido, vencido o ya usado')
    await audit(pool, user.id, 'withdrawal_verified', consumed.order_id)
    return { order: await presentOrder(await loadOrder('o.id', consumed.order_id)) }
  })
}
