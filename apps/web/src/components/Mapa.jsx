import { Wallet } from 'lucide-react'

// Mapa ilustrado de La Paz con los cajeros asociados. Los pines se pueden tocar.
export default function Mapa({ cajeros, selected, onSelect, className = '' }) {
  const blocks = []
  const cols = [[-20, 150], [150, 110], [282, 140]]
  const rows = [[52, 132], [210, 146], [382, 120]]
  cols.forEach(([x, w]) =>
    rows.forEach(([y, h]) => {
      const park = (x === 150 && y === 210) || (x === -20 && y === 382)
      blocks.push(<rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx="18" fill={park ? '#DCEAE4' : '#fff'} opacity={park ? 1 : 0.62} />)
    }),
  )
  return (
    <div className={`mapa ${className}`}>
      <svg className="mapa__svg" viewBox="0 0 393 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="393" height="520" fill="#F3EBDD" />
        {blocks}
        <g fill="#fff">
          <rect x="0" y="188" width="393" height="18" />
          <rect x="0" y="360" width="393" height="18" />
          <rect x="132" y="0" width="18" height="520" />
          <rect x="264" y="0" width="18" height="520" />
          <rect x="-40" y="330" width="520" height="24" transform="rotate(-18 220 342)" />
        </g>
        <path className="mapa__rio" d="M-10 130 C 80 95, 160 160, 250 120 S 360 85, 410 105" stroke="#CFE3DA" strokeWidth="18" strokeLinecap="round" fill="none" />
      </svg>
      {cajeros.map((c, i) => (
        <button
          key={c.id}
          type="button"
          className={`pin ${selected === c.id ? 'is-selected' : ''}`}
          style={{ left: `${c.pos.x}%`, top: `${c.pos.y}%`, '--i': i }}
          onClick={() => onSelect?.(c.id)}
          aria-label={c.nombre}
          aria-pressed={selected === c.id}
        >
          <Wallet size={selected === c.id ? 20 : 16} aria-hidden="true" />
        </button>
      ))}
      <span className="aqui" style={{ left: '60%', top: '74%' }} aria-hidden="true">
        <span className="aqui__halo" />
        <span className="aqui__dot" />
      </span>
    </div>
  )
}
