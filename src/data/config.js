// Datos del prototipo. Todo es referencial: en producción vendría del servidor.

export const APP_NAME = 'TilcaGo'

// Tipo de cambio referencial usado en el diseño (1 USD = 6.96 Bs)
export const RATE = 6.96
// Comisión total de TilcaGo sobre el monto cambiado
export const FEE = 0.015
// Comisiones de comparación (valores referenciales del diseño)
export const REMESADORA_FEE = 0.06
export const AEROPUERTO_FEE = 0.08
// Reparto de ejemplo para la app del cajero: está por definir con el equipo
export const EJEMPLO_COMISION_TILCAGO = 0.01

// Minutos que la tasa queda fija para una cotización
export const TASA_FIJA_MIN = 10

export const ORDER_CODE = 'TG-7K4-92Q'
export const STELLAR_TX = '7c2e91d4b0a35f8e6c1d2a7b9e04f3a9'
export const STELLAR_EXPLORER = 'https://stellar.expert/explorer/testnet'

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

/** Cotiza un cambio: cuánto efectivo recibe el turista por `usd` dólares digitales. */
export function cotizar(usd) {
  const bruto = round2(usd * RATE)
  const comision = round2(bruto * FEE)
  const efectivo = round2(bruto - comision)
  const ahorro = round2(bruto * REMESADORA_FEE - comision)
  return { usd, bruto, comision, efectivo, ahorro }
}

/** Lo que recibe el cajero en USDC en el ejemplo (reparto por definir). */
export function liquidacionCajero(usd) {
  const comisionTilcago = round2(usd * EJEMPLO_COMISION_TILCAGO)
  return { pago: usd, comisionTilcago, recibe: round2(usd - comisionTilcago) }
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
  reservado: 1028.34,
  wallet: 'GBK2…9PLM',
}

// Cajeros asociados. `pos` es la ubicación en el mapa ilustrado (porcentaje).
export const CAJEROS = [
  { id: 'sc', ini: 'SC', nombre: 'Sagárnaga Cambios', zona: 'Calle Sagárnaga 213', distancia: 220, rating: 4.9, retiros: 230, efectivo: 8500, pos: { x: 47, y: 52 } },
  { id: 'mt', ini: 'MT', nombre: 'Minimarket Tiwanaku', zona: 'Sopocachi', distancia: 450, rating: 4.8, retiros: 142, efectivo: 5200, pos: { x: 14, y: 30 } },
  { id: 'ha', ini: 'HA', nombre: 'Hostal Andino', zona: 'Centro', distancia: 600, rating: 4.7, retiros: 98, efectivo: 3000, pos: { x: 82, y: 28 } },
  { id: 'iw', ini: 'IW', nombre: 'Internet Wara', zona: 'Miraflores', distancia: 750, rating: 4.6, retiros: 61, efectivo: 2400, pos: { x: 86, y: 72 } },
]

export const METODOS = [
  { id: 'usdc', titulo: 'USDC', sub: { es: 'Red Stellar · confirmación en ~5 s', en: 'Stellar network · confirms in ~5 s' }, icono: 'dollar' },
  { id: 'usdt', titulo: 'USDT', sub: { es: 'Red TRC-20 · ~1 min', en: 'TRC-20 network · ~1 min' }, icono: 'dollar' },
  { id: 'btc', titulo: 'Bitcoin', sub: { es: 'Lightning Network · instantáneo', en: 'Lightning Network · instant' }, icono: 'bitcoin' },
  { id: 'card', titulo: 'Tarjeta', sub: { es: 'Visa / Mastercard · +1 % de recargo', en: 'Visa / Mastercard · +1% surcharge' }, icono: 'card' },
]

// Historial del turista (octubre 2026)
export const MOVIMIENTOS = [
  { id: 1, grupo: 'hoy', estado: 'pendiente', titulo: 'Sagárnaga Cambios', detalle: { es: 'Válido hasta 18:30 · 100 USDC', en: 'Valid until 18:30 · 100 USDC' }, monto: 'Bs 685.56' },
  { id: 2, grupo: 'semana', estado: 'retirado', titulo: 'Minimarket Tiwanaku', detalle: { es: 'Mié 14 oct · 50 USDC', en: 'Wed Oct 14 · 50 USDC' }, monto: 'Bs 342.78' },
  { id: 3, grupo: 'semana', estado: 'retirado', titulo: 'Hostal Andino', detalle: { es: 'Mar 13 oct · 150 USDC', en: 'Tue Oct 13 · 150 USDC' }, monto: 'Bs 1,028.34' },
  { id: 4, grupo: 'semana', estado: 'reembolsado', titulo: { es: 'Orden vencida', en: 'Expired order' }, detalle: { es: 'Lun 12 oct · 20 USDC', en: 'Mon Oct 12 · 20 USDC' }, monto: '20.00 USDC' },
]

// Órdenes reservadas para la cajera
export const ORDENES = [
  { id: 'o1', turista: 'Ana S.', codigo: 'TG-7K4-92Q', vence: '18:30', usd: 100, monto: 'Bs 685.56' },
  { id: 'o2', turista: 'Lucas M.', codigo: 'TG-2P9-41X', vence: '19:05', usd: 50, monto: 'Bs 342.78' },
]

// Ganancias de la cajera en los últimos 7 días (USDC)
export const GANANCIAS = [
  { dia: { es: 'D', en: 'S' }, usdc: 1.5 },
  { dia: { es: 'L', en: 'M' }, usdc: 2.1 },
  { dia: { es: 'M', en: 'T' }, usdc: 3.4 },
  { dia: { es: 'M', en: 'W' }, usdc: 1.8 },
  { dia: { es: 'J', en: 'T' }, usdc: 4.2 },
  { dia: { es: 'V', en: 'F' }, usdc: 3.0 },
  { dia: { es: 'S', en: 'S' }, usdc: 2.6 },
]

export const LIQUIDACIONES = [
  { id: 'l1', estado: 'pendiente', titulo: { es: 'Liquidación de hoy', en: "Today's payout" }, detalle: { es: 'Hoy, 20:00 · 4 retiros', en: 'Today, 20:00 · 4 withdrawals' }, monto: '+2.60 USDC', chip: { es: 'Programada', en: 'Scheduled' } },
  { id: 'l2', estado: 'retirado', titulo: { es: 'Liquidación', en: 'Payout' }, detalle: { es: 'Vie 16 oct · 6 retiros', en: 'Fri Oct 16 · 6 withdrawals' }, monto: '+3.00 USDC', chip: { es: 'Pagada', en: 'Paid' } },
  { id: 'l3', estado: 'retirado', titulo: { es: 'Liquidación', en: 'Payout' }, detalle: { es: 'Jue 15 oct · 7 retiros', en: 'Thu Oct 15 · 7 withdrawals' }, monto: '+4.20 USDC', chip: { es: 'Pagada', en: 'Paid' } },
]
