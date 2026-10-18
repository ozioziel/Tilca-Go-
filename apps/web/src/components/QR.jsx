import QRLib from 'qrcode'

// QR de demostración (patrón fijo, no codifica datos reales), QR real y capa de «¡Listo!».

function buildPath(n, seed) {
  let s = seed
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280
  const inFinder = (x, y) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8)
  let d = ''
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!inFinder(x, y) && rnd() > 0.5) d += `M${x} ${y}h1v1h-1z`
    }
  }
  const finder = (x, y) => `M${x} ${y}h7v7h-7z M${x + 1} ${y + 1}v5h5v-5z M${x + 2} ${y + 2}h3v3h-3z`
  return d + finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7)
}

const CACHE = new Map()

export function QRCode({ seed = 11, size = 25, className = '' }) {
  const key = `${seed}-${size}`
  if (!CACHE.has(key)) CACHE.set(key, buildPath(size, seed))
  return (
    <svg className={`qr ${className}`} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" role="img" aria-label="Código QR">
      <path d={CACHE.get(key)} fill="#2A211C" fillRule="evenodd" />
    </svg>
  )
}

/** Capa que aparece al terminar el escaneo. */
export function Listo({ title, sub, dark = false, className = '' }) {
  return (
    <div className={`listo ${dark ? 'listo--dark' : ''} ${className}`} role="status">
      <svg className="listo__check" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#2E6B5B" />
        <path d="M19 33 l9 9 l17 -19" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <strong>{title}</strong>
      <span>{sub}</span>
    </div>
  )
}

/** QR real que codifica `text` (lo escanea la app del cajero). */
export function RealQR({ text, className = '' }) {
  const qr = QRLib.create(text, { errorCorrectionLevel: 'M' })
  const n = qr.modules.size
  let d = ''
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) if (qr.modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`
  }
  return (
    <svg className={`qr ${className}`} viewBox={`-1 -1 ${n + 2} ${n + 2}`} shapeRendering="crispEdges" role="img" aria-label={text}>
      <path d={d} fill="#2A211C" />
    </svg>
  )
}
