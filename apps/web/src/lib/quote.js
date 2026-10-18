import { FEE, MARGEN, RATE_REF } from '../data/config'

const round2 = (n) => Math.round(n * 100 + 1e-7) / 100

/**
 * Cotización local para mostrar mientras se escribe. Usa la tasa del API (`/rate`)
 * o, sin conexión, los valores de ejemplo de config.js. El monto que vale es el
 * de la cotización que fija el servidor al continuar.
 */
export function cotizarCon(rate, usdc) {
  const ref = rate ? Number(rate.rate_ref_bob) : RATE_REF
  const margen = rate ? rate.margin_bps / 10_000 : MARGEN
  const fee = rate ? rate.fee_bps / 10_000 : FEE
  const aplicada = Math.round(ref * (1 - margen) * 10_000) / 10_000
  const comisionUsdc = round2(usdc * fee)
  return {
    usd: usdc,
    ref,
    margen,
    fee,
    aplicada,
    referencia: round2(usdc * ref),
    margenBs: round2(usdc * ref * margen),
    comisionUsdc,
    comision: round2(comisionUsdc * aplicada),
    efectivo: round2((usdc - comisionUsdc) * aplicada),
  }
}

/** Cuánto USDC enviar para recibir `bs` bolivianos. */
export function usdcParaCon(rate, bs) {
  const q = cotizarCon(rate, 1)
  return Math.round((bs / (q.aplicada * (1 - q.fee))) * 100) / 100
}
