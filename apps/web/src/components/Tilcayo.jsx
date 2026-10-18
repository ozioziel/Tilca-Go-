// El tilcayo (Leopardus tilcayo), mascota de TilcaGo, dibujado en SVG.
// Son las mismas poses del diseño en Figma: echado (logo), trepando, asomado y feliz.

const FUR = '#D3A26B'
const LIGHT = '#F6E7CF'
const INK = '#2A211C'
const SPOT = '#3B2A1F'
const SPOT_FILL = '#B07A45'
const EYE = '#2E6B5B'
const NOSE = '#C2603A'
const EAR_IN = '#E8A58C'
const BLUSH = '#F0A58A'

// Cabeza centrada en (80, 91). `mood`: 'normal' u 'happy'
const head = (mood) =>
  `<path d="M55 82 Q50 56 61 52 Q70 55 77 67 Z" fill="${FUR}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
  `<path d="M59 76 Q56 61 62 58 Q67 60 71 67 Z" fill="${EAR_IN}"/>` +
  `<path d="M105 82 Q110 56 99 52 Q90 55 83 67 Z" fill="${FUR}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
  `<path d="M101 76 Q104 61 98 58 Q93 60 89 67 Z" fill="${EAR_IN}"/>` +
  `<ellipse cx="80" cy="91" rx="28" ry="26" fill="${FUR}" stroke="${INK}" stroke-width="3"/>` +
  `<path d="M74 69 L75 78 M80 67 L80 77 M86 69 L85 78" stroke="${SPOT}" stroke-width="2.6" stroke-linecap="round" fill="none"/>` +
  `<path d="M54 94 L60 95.5 M55 99.5 L60.5 99 M106 94 L100 95.5 M105 99.5 L99.5 99" stroke="${SPOT}" stroke-width="2.2" stroke-linecap="round" fill="none"/>` +
  `<ellipse cx="80" cy="103" rx="12.5" ry="8.5" fill="${LIGHT}"/>` +
  (mood === 'happy'
    ? `<path d="M63 92 Q69 85 75 92 M85 92 Q91 85 97 92" stroke="${INK}" stroke-width="2.8" stroke-linecap="round" fill="none"/>` +
      `<ellipse cx="62" cy="100" rx="4.2" ry="2.5" fill="${BLUSH}" fill-opacity="0.75"/><ellipse cx="98" cy="100" rx="4.2" ry="2.5" fill="${BLUSH}" fill-opacity="0.75"/>`
    : `<g class="tc-eyes"><ellipse cx="69" cy="90" rx="6.5" ry="7.5" fill="${EYE}" stroke="${INK}" stroke-width="1.6"/>` +
      `<ellipse cx="91" cy="90" rx="6.5" ry="7.5" fill="${EYE}" stroke="${INK}" stroke-width="1.6"/>` +
      `<ellipse cx="69" cy="90.5" rx="2.6" ry="5" fill="#1B1511"/><ellipse cx="91" cy="90.5" rx="2.6" ry="5" fill="#1B1511"/>` +
      `<circle cx="71" cy="87" r="1.8" fill="#fff"/><circle cx="93" cy="87" r="1.8" fill="#fff"/></g>` +
      `<path d="M63 98 Q69 100.5 75 98 M85 98 Q91 100.5 97 98" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none"/>`) +
  `<path d="M76.5 99.5 H83.5 L80 104 Z" fill="${NOSE}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` +
  `<path d="M80 104 V106.5 M80 106.5 Q77 109.5 74 107.5 M80 106.5 Q83 109.5 86 107.5" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" fill="none"/>` +
  `<path d="M68 104 L50 101 M68 107 L51 109 M92 104 L110 101 M92 107 L109 109" stroke="${INK}" stroke-opacity="0.45" stroke-width="1.1" stroke-linecap="round"/>`

// Roseta irregular: elipse con borde punteado
const rosette = (cx, cy, r, rx = 6, ry = 4.6, sw = 2.4, dash = '5 2.6') =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${SPOT_FILL}" stroke="${SPOT}" stroke-width="${sw}" stroke-dasharray="${dash}" transform="rotate(${r} ${cx} ${cy})"/>`

const leg = (x1, y1, x2, y2) => {
  const mx = x1 + (x2 - x1) * 0.45
  const my = y1 + (y2 - y1) * 0.45
  return (
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="17" stroke-linecap="round"/>` +
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${FUR}" stroke-width="12" stroke-linecap="round"/>` +
    `<circle cx="${mx}" cy="${my}" r="2.4" fill="${SPOT}"/>` +
    `<circle cx="${x2}" cy="${y2}" r="8.5" fill="${LIGHT}" stroke="${INK}" stroke-width="2.5"/>`
  )
}

const tail = (d, w1 = 14, w2 = 9, dash = '5 7') =>
  `<path d="${d}" stroke="${INK}" stroke-width="${w1}" stroke-linecap="round" fill="none"/>` +
  `<path d="${d}" stroke="${FUR}" stroke-width="${w2}" stroke-linecap="round" fill="none"/>` +
  `<path d="${d}" stroke="${SPOT}" stroke-width="${w2}" stroke-dasharray="${dash}" fill="none"/>`

// Pose trepando, de espaldas. A y B alternan las patas para simular la trepada.
const climb = (v) => {
  const legs =
    v === 'A'
      ? [[64, 118, 34, 64], [96, 118, 126, 86], [66, 166, 42, 198], [94, 166, 114, 184]]
      : [[64, 118, 34, 86], [96, 118, 126, 64], [66, 166, 46, 184], [94, 166, 118, 198]]
  const tailPath = v === 'A' ? 'M80 176 C 82 198, 104 204, 110 224' : 'M80 176 C 78 198, 56 204, 50 224'
  const tip = v === 'A' ? [110, 224] : [50, 224]
  const spots = [[68, 120, 0], [92, 124, 30], [80, 138, -20], [64, 150, 15], [96, 152, -10], [78, 164, 25], [90, 174, 0], [68, 174, -30]]
  return (
    tail(tailPath) +
    `<circle cx="${tip[0]}" cy="${tip[1]}" r="4.6" fill="${SPOT}"/>` +
    legs.map((l) => leg(...l)).join('') +
    `<ellipse cx="80" cy="142" rx="29" ry="40" fill="${FUR}" stroke="${INK}" stroke-width="3"/>` +
    spots.map((s) => rosette(...s)).join('') +
    [[72, 132], [88, 142], [86, 162], [72, 160]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${SPOT}"/>`).join('') +
    head('normal')
  )
}

const star = (x, y, s = 5) =>
  `<path d="M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z" fill="${NOSE}"/>`

const peek = (mood) =>
  head(mood) +
  `<ellipse cx="64" cy="118" rx="9.5" ry="6" fill="${LIGHT}" stroke="${INK}" stroke-width="2.5"/>` +
  `<ellipse cx="96" cy="118" rx="9.5" ry="6" fill="${LIGHT}" stroke="${INK}" stroke-width="2.5"/>` +
  `<path d="M61 115 V120 M66.5 115 V120 M93.5 115 V120 M99 115 V120" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>` +
  (mood === 'happy' ? `<g class="tc-sparkles">${star(48, 60)}${star(113, 64)}</g>` : '')

const lying = () => {
  const spots = [[28, 50, 10], [44, 41, -15], [60, 40, 20], [74, 43, 0], [40, 54, 25], [58, 53, -10], [76, 54, 15], [92, 53, 0]]
  return (
    `<path d="M14 62 C 8 46, 22 31, 48 31 L 84 33 C 100 34, 110 47, 108 62 Z" fill="${FUR}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>` +
    `<path d="M28 62 C 24 52, 30 44, 42 43" stroke="${INK}" stroke-opacity="0.45" stroke-width="1.6" stroke-linecap="round" fill="none"/>` +
    spots.map((s) => rosette(s[0], s[1], s[2], 5, 3.8, 2, '4 2.2')).join('') +
    [[36, 37], [52, 34.5], [68, 35.5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="${SPOT}"/>`).join('') +
    `<g class="tc-tail">${tail('M15 56 C 2 58, 2 66, 12 66 L 52 66', 9, 5.5, '4 4.5')}<circle cx="52" cy="66" r="2.8" fill="${SPOT}"/></g>` +
    `<ellipse cx="113" cy="61" rx="10.5" ry="4.4" fill="${LIGHT}" stroke="${INK}" stroke-width="2"/>` +
    `<ellipse cx="104" cy="63.5" rx="11" ry="4.6" fill="${LIGHT}" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M108 61.5 V65.5 M111.5 61.5 V65" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/>` +
    `<g transform="translate(42.4 -35.52) scale(0.72)">${head('normal')}</g>`
  )
}

const POSES = {
  echado: { viewBox: '0 0 128 72', markup: lying },
  trepandoA: { viewBox: '0 0 160 236', markup: () => climb('A') },
  trepandoB: { viewBox: '0 0 160 236', markup: () => climb('B') },
  asomado: { viewBox: '40 44 80 82', markup: () => peek('normal') },
  feliz: { viewBox: '40 44 80 82', markup: () => peek('happy') },
}

// Se calcula una sola vez: el dibujo no depende de datos del usuario
const CACHE = Object.fromEntries(Object.entries(POSES).map(([k, v]) => [k, v.markup()]))

/**
 * Dibuja al tilcayo. `pose`: echado | trepando | trepandoA | trepandoB | asomado | feliz.
 * La pose "trepando" alterna A y B con CSS para que mueva las patas.
 */
export default function Tilcayo({ pose = 'asomado', className = '', style, title }) {
  if (pose === 'trepando') {
    return (
      <span className={`tc tc--trepando ${className}`} style={style} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
        <svg className="tc__a" viewBox={POSES.trepandoA.viewBox} dangerouslySetInnerHTML={{ __html: CACHE.trepandoA }} />
        <svg className="tc__b" viewBox={POSES.trepandoB.viewBox} dangerouslySetInnerHTML={{ __html: CACHE.trepandoB }} />
      </span>
    )
  }
  const p = POSES[pose] ?? POSES.asomado
  return (
    <svg
      className={`tc tc--${pose} ${className}`}
      style={style}
      viewBox={p.viewBox}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: CACHE[pose] }}
    />
  )
}
