// Valores de respaldo y textos fijos. Los datos reales (tasa, cajeros, órdenes) vienen del API.

// Cotización de ejemplo de la v3, usada solo si el API no responde:
// referencia de mercado (Bs por USDC), margen de volatilidad y comisión total
export const RATE_REF = 10.0
export const MARGEN = 0.005
export const FEE = 0.015

// Cajeros ilustrativos de la landing (la app usa los del API). `pos` es la ubicación en el mapa (porcentaje).
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
