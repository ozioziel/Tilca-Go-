// Aritmética de montos en enteros (nunca float).
//   USDC: unidades mínimas de 7 decimales (1 USDC = 10_000_000)
//   BOB:  centavos (1 Bs = 100)
//   Tasas: Bs por USDC × 10⁴ (9.95 → 99_500)

export const USDC_UNIT = 10_000_000n
const BPS = 10_000n
const E4 = 10_000n

/** División entera redondeando la mitad hacia arriba (solo para valores no negativos). */
export function divRound(a: bigint, b: bigint): bigint {
  return (a * 2n + b) / (b * 2n)
}

/** "100", "100.5" o "0.0000001" → unidades mínimas. Rechaza más de 7 decimales. */
export function parseUsdc(s: string): bigint {
  const m = /^(\d{1,12})(?:\.(\d{1,7}))?$/.exec(s.trim())
  if (!m) throw new Error('Monto USDC inválido')
  return BigInt(m[1]) * USDC_UNIT + BigInt((m[2] ?? '').padEnd(7, '0'))
}

/** "10", "9.95" o "6.9600" → tasa × 10⁴. */
export function parseRateE4(s: string): bigint {
  const m = /^(\d{1,6})(?:\.(\d{1,4}))?$/.exec(s.trim())
  if (!m) throw new Error('Tasa inválida')
  return BigInt(m[1]) * E4 + BigInt((m[2] ?? '').padEnd(4, '0'))
}

export function formatUsdc(units: bigint, decimals = 2): string {
  const whole = units / USDC_UNIT
  const frac = (units % USDC_UNIT).toString().padStart(7, '0').slice(0, decimals)
  return decimals ? `${whole}.${frac}` : whole.toString()
}

export function formatBob(cents: bigint): string {
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`
}

/** Bolivianos (centavos) que corresponden a `usdc` unidades con la tasa `rateE4`. */
export function usdcToBobCents(usdc: bigint, rateE4: bigint): bigint {
  // usdc/10⁷ USDC × rateE4/10⁴ Bs × 100 centavos = usdc × rateE4 / 10⁹
  return divRound(usdc * rateE4, 1_000_000_000n)
}

export interface QuoteMath {
  grossUsdc: bigint
  rateRefE4: bigint
  marginBps: number
  rateAppliedE4: bigint
  feeBps: number
  feeUsdc: bigint
  netUsdc: bigint
  netBobCents: bigint
  /** Desglose informativo en centavos: referencia, margen y comisión. */
  refBobCents: bigint
  marginBobCents: bigint
  feeBobCents: bigint
}

/**
 * Cotización de la v3 (§6.2):
 *   tasa aplicada = referencia × (1 − margen)
 *   comisión      = monto × fee_bps
 *   efectivo      = (monto − comisión) × tasa aplicada
 */
export function computeQuote(grossUsdc: bigint, rateRefE4: bigint, marginBps: number, feeBps: number): QuoteMath {
  if (grossUsdc <= 0n) throw new Error('El monto debe ser mayor que cero')
  const rateAppliedE4 = divRound(rateRefE4 * (BPS - BigInt(marginBps)), BPS)
  const feeUsdc = divRound(grossUsdc * BigInt(feeBps), BPS)
  const netUsdc = grossUsdc - feeUsdc
  const refBobCents = usdcToBobCents(grossUsdc, rateRefE4)
  return {
    grossUsdc,
    rateRefE4,
    marginBps,
    rateAppliedE4,
    feeBps,
    feeUsdc,
    netUsdc,
    netBobCents: usdcToBobCents(netUsdc, rateAppliedE4),
    refBobCents,
    marginBobCents: refBobCents - usdcToBobCents(grossUsdc, rateAppliedE4),
    feeBobCents: usdcToBobCents(feeUsdc, rateAppliedE4),
  }
}

/** Reparto que hace el contrato en `release` (misma fórmula que TilcaGoEscrow::split). */
export function contractSplit(amount: bigint, platformFeeBps: number): { agent: bigint; platform: bigint } {
  const platform = (amount * BigInt(platformFeeBps)) / BPS
  return { agent: amount - platform, platform }
}
