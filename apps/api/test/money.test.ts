import { describe, expect, it } from 'vitest'
import { computeQuote, contractSplit, formatBob, formatUsdc, parseRateE4, parseUsdc, usdcToBobCents } from '../src/lib/money'

describe('montos', () => {
  it('lee USDC y tasas sin perder decimales', () => {
    expect(parseUsdc('100')).toBe(1_000_000_000n)
    expect(parseUsdc('0.0000001')).toBe(1n)
    expect(parseUsdc('12.5')).toBe(125_000_000n)
    expect(() => parseUsdc('1.00000001')).toThrow()
    expect(() => parseUsdc('-1')).toThrow()
    expect(parseRateE4('9.95')).toBe(99_500n)
    expect(parseRateE4('6.96')).toBe(69_600n)
  })

  it('formatea', () => {
    expect(formatUsdc(995_000_000n)).toBe('99.50')
    expect(formatBob(98_008n)).toBe('980.08')
    expect(formatBob(5n)).toBe('0.05')
  })

  it('reproduce el ejemplo de la v3: 100 USDC → Bs 980.08', () => {
    const q = computeQuote(parseUsdc('100'), parseRateE4('10.00'), 50, 150)
    expect(q.rateAppliedE4).toBe(99_500n) // 9.95
    expect(q.feeUsdc).toBe(15_000_000n) // 1.50 USDC
    expect(q.netUsdc).toBe(985_000_000n)
    expect(q.netBobCents).toBe(98_008n) // 98.5 × 9.95 = 980.075 → 980.08
    expect(q.refBobCents).toBe(100_000n)
    expect(q.marginBobCents).toBe(500n)
    expect(q.feeBobCents).toBe(1_493n) // 1.5 × 9.95 = 14.925 → 14.93
  })

  it('coincide con el prototipo para 50 y 150 USDC', () => {
    const rate = parseRateE4('10.00')
    expect(computeQuote(parseUsdc('50'), rate, 50, 150).netBobCents).toBe(49_004n)
    expect(computeQuote(parseUsdc('150'), rate, 50, 150).netBobCents).toBe(147_011n)
  })

  it('rechaza montos no positivos', () => {
    expect(() => computeQuote(0n, 100_000n, 50, 150)).toThrow()
  })

  it('reparte igual que el contrato', () => {
    expect(contractSplit(1_000_000_000n, 50)).toEqual({ agent: 995_000_000n, platform: 5_000_000n })
    expect(contractSplit(1n, 50)).toEqual({ agent: 1n, platform: 0n })
  })

  it('convierte con redondeo a la mitad hacia arriba', () => {
    expect(usdcToBobCents(1n, 99_500n)).toBe(0n)
    expect(usdcToBobCents(10_000_000n, 99_500n)).toBe(995n)
  })
})
