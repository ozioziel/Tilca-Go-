// Datos del prototipo. Todo es referencial: en producción vendría del servidor.

export const APP_NAME = 'TilcaGo'

// Tipo de cambio de referencia de mercado (Bs por USDC). Es un valor de EJEMPLO:
// en producción sale de varias fuentes de mercado y se guarda con cada cotización.
export const RATE_REF = 10.0
// Margen de volatilidad: protege la ventana de 10 minutos en que la tasa queda fija
export const MARGEN = 0.005
// Tipo aplicado al turista = referencia × (1 − margen)
export const RATE = Math.round(RATE_REF * (1 - MARGEN) * 10000) / 10000
// Comisión total sobre el monto en USDC y su reparto (ejemplo, por definir con el equipo)
export const FEE = 0.015
export const FEE_AGENTE = 0.01
export const FEE_TILCAGO = 0.005

// Minutos que la tasa queda fija para una cotización
export const TASA_FIJA_MIN = 10

export const ORDER_CODE = 'TG-7K4-92Q'
export const STELLAR_TX = '7c2e91d4b0a35f8e6c1d2a7b9e04f3a9'
export const STELLAR_TX_RELEASE = '9a41b07ce35d8f21a6e04b9d7c13f5e2'
export const STELLAR_EXPLORER = 'https://stellar.expert/explorer/testnet'

// Redondeo a centavos tolerante al error de coma flotante (98.5 × 9.95 = 980.075 → 980.08)
const round2 = (n) => Math.round(n * 100 + 1e-7) / 100

/**
 * Cotiza un cambio de `usdc`. Solo se mueve USDC en la cadena; los bolivianos
 * son un compromiso que entrega el cajero en efectivo.
 */
export function cotizar(usdc) {
  const comisionUsdc = round2(usdc * FEE)
  const netoUsdc = round2(usdc - comisionUsdc)
  const referencia = round2(usdc * RATE_REF)
  const margen = round2(usdc * RATE_REF * MARGEN)
  const comision = round2(comisionUsdc * RATE)
  const efectivo = round2(netoUsdc * RATE)
  return { usd: usdc, referencia, margen, comisionUsdc, comision, efectivo }
}

/** Cuánto USDC hay que enviar para recibir `bs` bolivianos. */
export function usdcPara(bs) {
  return Math.round((bs / (RATE * (1 - FEE))) * 100) / 100
}

/** Reparto que hace el contrato al liberar el pago (ejemplo, por definir). */
export function liquidacionCajero(usdc) {
  const comisionTilcago = round2(usdc * FEE_TILCAGO)
  const comisionAgente = round2(usdc * FEE_AGENTE)
  return { pago: usdc, comisionTilcago, comisionAgente, recibe: round2(usdc - comisionTilcago) }
}

export const TURISTA = {
  nombre: 'Ana Schmidt',
  iniciales: 'AS',
  pais: { es: 'Alemania', en: 'Germany' },
  correo: 'ana.schmidt@mail.com',
  pasaporte: 'C01X00T47',
  wallet: 'GDX4…K7QF',
  saldo: 250,
}

export const CAJERA = {
  nombre: 'Rosa',
  local: 'Sagárnaga Cambios',
  direccion: 'Calle Sagárnaga 213',
  efectivo: 8500,
  reservado: 1470.12,
  wallet: 'GBK2…9PLM',
}

// Cajeros asociados. `pos` es la ubicación en el mapa ilustrado (porcentaje).
export const CAJEROS = [
  { id: 'sc', ini: 'SC', nombre: 'Sagárnaga Cambios', zona: 'Calle Sagárnaga 213', distancia: 220, rating: 4.9, retiros: 230, efectivo: 8500, pos: { x: 47, y: 52 } },
  { id: 'mt', ini: 'MT', nombre: 'Minimarket Tiwanaku', zona: 'Sopocachi', distancia: 450, rating: 4.8, retiros: 142, efectivo: 5200, pos: { x: 14, y: 30 } },
  { id: 'ha', ini: 'HA', nombre: 'Hostal Andino', zona: 'Centro', distancia: 600, rating: 4.7, retiros: 98, efectivo: 3000, pos: { x: 82, y: 28 } },
  { id: 'iw', ini: 'IW', nombre: 'Internet Wara', zona: 'Miraflores', distancia: 750, rating: 4.6, retiros: 61, efectivo: 2400, pos: { x: 86, y: 72 } },
]

// En el MVP solo se paga con USDC en Stellar desde la wallet del turista (opción A)
export const METODOS = [
  { id: 'usdc', titulo: 'USDC', sub: { es: 'Red Stellar · confirmación en ~5 s', en: 'Stellar network · confirms in ~5 s' }, icono: 'dollar' },
]
// Otros medios: fuera del MVP, se muestran como «próximamente»
export const METODOS_PRONTO = {
  titulo: { es: 'USDT, Bitcoin o tarjeta', en: 'USDT, Bitcoin or card' },
  sub: { es: 'Próximamente · no disponible en el MVP', en: 'Coming soon · not in the MVP' },
}

// Historial del turista (octubre 2026)
export const MOVIMIENTOS = [
  { id: 1, grupo: 'hoy', estado: 'pendiente', titulo: 'Sagárnaga Cambios', detalle: { es: 'Válido hasta 18:30 · 100 USDC', en: 'Valid until 18:30 · 100 USDC' }, monto: 'Bs 980.08' },
  { id: 2, grupo: 'semana', estado: 'retirado', titulo: 'Minimarket Tiwanaku', detalle: { es: 'Mié 14 oct · 50 USDC', en: 'Wed Oct 14 · 50 USDC' }, monto: 'Bs 490.04' },
  { id: 3, grupo: 'semana', estado: 'retirado', titulo: 'Hostal Andino', detalle: { es: 'Mar 13 oct · 150 USDC', en: 'Tue Oct 13 · 150 USDC' }, monto: 'Bs 1,470.11' },
  { id: 4, grupo: 'semana', estado: 'reembolsado', titulo: { es: 'Orden vencida', en: 'Expired order' }, detalle: { es: 'Lun 12 oct · 20 USDC', en: 'Mon Oct 12 · 20 USDC' }, monto: '20.00 USDC' },
]

// Órdenes reservadas para la cajera
export const ORDENES = [
  { id: 'o1', turista: 'Ana S.', codigo: 'TG-7K4-92Q', vence: '18:30', usd: 100, monto: 'Bs 980.08' },
  { id: 'o2', turista: 'Lucas M.', codigo: 'TG-2P9-41X', vence: '19:05', usd: 50, monto: 'Bs 490.04' },
]

// Comisiones de la cajera en los últimos 7 días (USDC)
export const GANANCIAS = [
  { dia: { es: 'D', en: 'S' }, usdc: 1.5 },
  { dia: { es: 'L', en: 'M' }, usdc: 2.1 },
  { dia: { es: 'M', en: 'T' }, usdc: 3.4 },
  { dia: { es: 'M', en: 'W' }, usdc: 1.8 },
  { dia: { es: 'J', en: 'T' }, usdc: 4.2 },
  { dia: { es: 'V', en: 'F' }, usdc: 3.0 },
  { dia: { es: 'S', en: 'S' }, usdc: 2.6 },
]

// El contrato paga al cajero en cada entrega; aquí se agrupan por día
export const PAGOS_RECIBIDOS = [
  { id: 'p1', estado: 'retirado', titulo: { es: 'Hoy', en: 'Today' }, detalle: { es: '4 entregas · al instante', en: '4 handovers · instant' }, monto: '+2.60 USDC', chip: { es: 'Recibido', en: 'Received' } },
  { id: 'p2', estado: 'retirado', titulo: { es: 'Vie 16 oct', en: 'Fri Oct 16' }, detalle: { es: '6 entregas', en: '6 handovers' }, monto: '+3.00 USDC', chip: { es: 'Recibido', en: 'Received' } },
  { id: 'p3', estado: 'retirado', titulo: { es: 'Jue 15 oct', en: 'Thu Oct 15' }, detalle: { es: '7 entregas', en: '7 handovers' }, monto: '+4.20 USDC', chip: { es: 'Recibido', en: 'Received' } },
]
