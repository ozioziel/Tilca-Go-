import { Check } from 'lucide-react'

/** Lista de pasos de la entrega en el mostrador. pasos: [{ label, hecho, activo }] */
export default function PasosEntrega({ pasos }) {
  return (
    <ol className="pasos-entrega">
      {pasos.map((p, i) => (
        <li key={i} className={`pasos-entrega__item ${p.hecho ? 'is-hecho' : ''} ${p.activo ? 'is-activo' : ''}`}>
          <span className="pasos-entrega__punto" aria-hidden="true">
            {p.hecho && <Check size={12} strokeWidth={3} />}
          </span>
          <span className="body-s">{p.label}</span>
        </li>
      ))}
    </ol>
  )
}
