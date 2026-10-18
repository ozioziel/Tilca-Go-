import { rpc, scValToNative } from '@stellar/stellar-sdk'
import type pg from 'pg'
import { config } from '../config'
import { audit, pool, tx } from '../db/pool'
import { server } from './escrow'

/**
 * Sincroniza el estado de las órdenes con los eventos del contrato.
 * El contrato manda: si la base y la cadena difieren, gana la cadena (v3 §7.4).
 * Cada evento se procesa una sola vez (clave: id del evento en Stellar RPC).
 */

export interface EscrowEvent {
  id: string
  ledger: number
  txHash: string | null
  name: string
  contractOrderId: string
  data: Record<string, unknown>
}

export function parseEvent(ev: rpc.Api.EventResponse): EscrowEvent | null {
  const [nameVal, idVal] = ev.topic
  if (!nameVal || !idVal || nameVal.type !== 'scvSymbol' || idVal.type !== 'scvBytes') return null
  const native = ev.value ? scValToNative(ev.value) : undefined
  return {
    id: ev.id,
    ledger: ev.ledger,
    txHash: (ev as { txHash?: string }).txHash ?? null,
    name: nameVal.sym.toString(),
    contractOrderId: Buffer.from(idVal.bytes.toBytes()).toString('hex'),
    data: native && typeof native === 'object' ? (native as Record<string, unknown>) : {},
  }
}

interface OrderRow {
  id: string
  status: string
  agent_id: string
  tourist_wallet: string
  agent_wallet: string
  amount_usdc: bigint
  net_bob_cents: bigint
  expiry: Date
}

// Estados en los que la orden retiene efectivo reservado del cajero
const HOLDS_CASH = new Set(['AWAITING_PAYMENT', 'PAID_IN_ESCROW', 'IN_HANDOVER', 'DISPUTED'])

async function setStatus(db: pg.PoolClient, orderId: string, status: string, extra = '') {
  await db.query(`UPDATE orders SET status = $2, updated_at = now() ${extra} WHERE id = $1`, [orderId, status])
}

async function releaseReservation(db: pg.PoolClient, o: OrderRow) {
  await db.query('UPDATE agents SET cash_reserved_cents = cash_reserved_cents - $2, updated_at = now() WHERE id = $1', [
    o.agent_id,
    o.net_bob_cents,
  ])
}

/** Aplica un evento a la orden. Devuelve un texto corto con lo que hizo (queda en chain_events.result). */
export async function applyEvent(db: pg.PoolClient, ev: EscrowEvent, o: OrderRow): Promise<string> {
  switch (ev.name) {
    case 'deposited': {
      const amount = BigInt(String(ev.data.amount))
      const ok = amount === o.amount_usdc && ev.data.tourist === o.tourist_wallet && ev.data.agent === o.agent_wallet
      if (!ok) {
        // El depósito no coincide con la orden: no se emite código de retiro y operaciones revisa el caso
        await setStatus(db, o.id, 'PAYMENT_MISMATCH')
        await audit(db, 'chain', 'payment_mismatch', o.id, ev.data)
        return 'mismatch'
      }
      if (o.status !== 'AWAITING_PAYMENT' && o.status !== 'EXPIRED_UNPAID') return `ignored:${o.status}`
      if (o.status === 'EXPIRED_UNPAID') {
        // Llegó tarde: se intenta volver a reservar el efectivo
        const r = await db.query(
          `UPDATE agents SET cash_reserved_cents = cash_reserved_cents + $2
           WHERE id = $1 AND cash_declared_cents - cash_reserved_cents >= $2 RETURNING id`,
          [o.agent_id, o.net_bob_cents],
        )
        if (r.rowCount === 0) {
          await setStatus(db, o.id, 'PAYMENT_MISMATCH')
          await audit(db, 'chain', 'late_deposit_without_cash', o.id, ev.data)
          return 'late_without_cash'
        }
      }
      await setStatus(db, o.id, 'PAID_IN_ESCROW')
      await db.query(
        `INSERT INTO ledger_entries (order_id, account, debit, credit, currency, reference) VALUES
         ($1, 'escrow', $2, 0, 'USDC', $3), ($1, $4, 0, $2, 'USDC', $3)`,
        [o.id, amount, ev.txHash, `tourist:${o.tourist_wallet}`],
      )
      return 'paid'
    }
    case 'handover_started':
      if (o.status !== 'PAID_IN_ESCROW') return `ignored:${o.status}`
      await setStatus(db, o.id, 'IN_HANDOVER', ', handover_at = now()')
      return 'in_handover'
    case 'handover_cancelled':
      if (o.status !== 'IN_HANDOVER') return `ignored:${o.status}`
      await setStatus(db, o.id, 'PAID_IN_ESCROW')
      return 'paid'
    case 'disputed': {
      if (o.status !== 'IN_HANDOVER') return `ignored:${o.status}`
      await setStatus(db, o.id, 'DISPUTED')
      await db.query(
        `INSERT INTO disputes (order_id, opened_by, reason) SELECT $1, $2, $3
         WHERE NOT EXISTS (SELECT 1 FROM disputes WHERE order_id = $1 AND status = 'OPEN')`,
        [o.id, String(ev.data.by), `reason_hash:${String(ev.data.reason_hash ?? '')}`],
      )
      return 'disputed'
    }
    case 'released': {
      if (o.status !== 'IN_HANDOVER' && o.status !== 'DISPUTED') return `ignored:${o.status}`
      const agentAmount = BigInt(String(ev.data.agent_amount))
      const fee = BigInt(String(ev.data.fee))
      // El efectivo salió de la caja: baja lo declarado y lo reservado
      await db.query(
        `UPDATE agents SET cash_declared_cents = cash_declared_cents - $2, cash_reserved_cents = cash_reserved_cents - $2, updated_at = now()
         WHERE id = $1`,
        [o.agent_id, o.net_bob_cents],
      )
      await setStatus(db, o.id, 'SETTLED')
      await db.query(
        `INSERT INTO ledger_entries (order_id, account, debit, credit, currency, reference) VALUES
         ($1, 'escrow', 0, $2, 'USDC', $5),
         ($1, $3, $4, 0, 'USDC', $5),
         ($1, 'platform_fee', $6, 0, 'USDC', $5),
         ($1, $3, 0, $7, 'BOB', 'cash_handover')`,
        [o.id, o.amount_usdc, `agent:${o.agent_wallet}`, agentAmount, ev.txHash, fee, o.net_bob_cents],
      )
      await db.query(`UPDATE disputes SET status = 'RESOLVED', resolution = 'PAY_AGENT', resolved_at = now() WHERE order_id = $1 AND status = 'OPEN'`, [o.id])
      return 'settled'
    }
    case 'refunded': {
      if (o.status === 'REFUNDED' || o.status === 'SETTLED') return `ignored:${o.status}`
      if (HOLDS_CASH.has(o.status)) await releaseReservation(db, o)
      await setStatus(db, o.id, 'REFUNDED')
      await db.query(
        `INSERT INTO ledger_entries (order_id, account, debit, credit, currency, reference) VALUES
         ($1, 'escrow', 0, $2, 'USDC', $3), ($1, $4, $2, 0, 'USDC', $3)`,
        [o.id, o.amount_usdc, ev.txHash, `tourist:${o.tourist_wallet}`],
      )
      await db.query(`UPDATE disputes SET status = 'RESOLVED', resolution = 'REFUND_TOURIST', resolved_at = now() WHERE order_id = $1 AND status = 'OPEN'`, [o.id])
      return 'refunded'
    }
    default:
      return 'unknown_event'
  }
}

async function processEvent(ev: EscrowEvent) {
  await tx(async (db) => {
    const { rows } = await db.query<OrderRow>('SELECT * FROM orders WHERE contract_order_id = $1 FOR UPDATE', [ev.contractOrderId])
    const order = rows[0]
    const inserted = await db.query(
      `INSERT INTO chain_events (id, order_id, contract_order_id, tx_hash, ledger, name, payload, result)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') ON CONFLICT (id) DO NOTHING RETURNING id`,
      [ev.id, order?.id ?? null, ev.contractOrderId, ev.txHash, ev.ledger, ev.name, JSON.stringify(ev.data, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))],
    )
    if (inserted.rowCount === 0) return // ya procesado
    const result = order ? await applyEvent(db, ev, order) : 'unknown_order'
    await db.query('UPDATE chain_events SET result = $2 WHERE id = $1', [ev.id, result])
  })
}

let running: Promise<void> | null = null

/** Trae los eventos nuevos del contrato y los aplica. Seguro de llamar en paralelo. */
export function syncOnce(): Promise<void> {
  running ??= (async () => {
    try {
      const { rows } = await pool.query<{ cursor: string | null; start_ledger: number | null }>('SELECT cursor, start_ledger FROM chain_cursor WHERE id = 1')
      let cursor = rows[0]?.cursor ?? undefined
      let startLedger = rows[0]?.start_ledger ?? undefined
      if (!cursor && !startLedger) {
        // Primera vez: desde un rato antes del último ledger (la retención de RPC es limitada)
        startLedger = Math.max(1, (await server.getLatestLedger()).sequence - 2_000)
        await pool.query('INSERT INTO chain_cursor (id, start_ledger) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET start_ledger = $1', [startLedger])
      }
      for (let page = 0; page < 20; page++) {
        const filters = [{ type: 'contract' as const, contractIds: [config.ESCROW_CONTRACT_ID] }]
        const res = cursor
          ? await server.getEvents({ cursor, filters, limit: 100 })
          : await server.getEvents({ startLedger: startLedger!, filters, limit: 100 })
        for (const raw of res.events) {
          const ev = parseEvent(raw)
          if (ev) await processEvent(ev)
        }
        cursor = res.cursor
        await pool.query('UPDATE chain_cursor SET cursor = $1 WHERE id = 1', [cursor])
        if (res.events.length < 100) break
      }
    } finally {
      running = null
    }
  })()
  return running
}

/**
 * Sincroniza hasta que la orden deje el estado `from` (o se agoten los intentos).
 * Si ya había una sincronización en curso, puede haber empezado antes de la
 * transacción: por eso siempre se espera a que termine y se corre otra.
 */
export async function syncUntilChanged(contractOrderId: string, from: string, attempts = 8): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    if (running) await running.catch(() => {})
    await syncOnce()
    const { rows } = await pool.query<{ status: string }>('SELECT status FROM orders WHERE contract_order_id = $1', [contractOrderId])
    if (rows[0] && rows[0].status !== from) return
    await new Promise((r) => setTimeout(r, 700)) // el evento puede tardar un instante en aparecer en RPC
  }
}

/** Marca como vencidas las órdenes que no se pagaron y libera el efectivo reservado. */
export async function expireUnpaid(): Promise<number> {
  return tx(async (db) => {
    // Un minuto de gracia: la transacción de depósito vence con la cotización, así que no puede llegar después
    const { rows } = await db.query<OrderRow>(
      `UPDATE orders SET status = 'EXPIRED_UNPAID', updated_at = now()
       WHERE status = 'AWAITING_PAYMENT' AND payment_deadline < now() - interval '1 minute'
       RETURNING *`,
    )
    for (const o of rows) await releaseReservation(db, o)
    return rows.length
  })
}

export function startWorkers(log: (msg: string, err?: unknown) => void) {
  const loop = async () => {
    try {
      await syncOnce()
      await expireUnpaid()
    } catch (err) {
      log('Error sincronizando con Stellar', err)
    }
  }
  void loop()
  const id = setInterval(loop, config.SYNC_INTERVAL_MS)
  return () => clearInterval(id)
}
