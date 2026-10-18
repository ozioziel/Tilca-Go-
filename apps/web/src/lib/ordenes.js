// Cómo se muestra cada estado de orden del API en las filas de historial y listas.

export const ESTADO_FILA = {
  AWAITING_PAYMENT: 'pendiente',
  PAID_IN_ESCROW: 'pendiente',
  IN_HANDOVER: 'pendiente',
  DISPUTED: 'pendiente',
  SETTLED: 'retirado',
  REFUNDED: 'reembolsado',
  EXPIRED_UNPAID: 'reembolsado',
  PAYMENT_MISMATCH: 'pendiente',
}

/** Órdenes que siguen en curso para el turista (tienen código o esperan algo). */
export const ACTIVAS = new Set(['PAID_IN_ESCROW', 'IN_HANDOVER', 'DISPUTED'])

export function fecha(iso, lang) {
  return new Date(iso).toLocaleString(lang === 'en' ? 'en-US' : 'es-BO', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function esHoy(iso) {
  const d = new Date(iso)
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

export const usdc = (s) => Number(s).toFixed(2)
