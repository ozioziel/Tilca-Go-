import Tilcayo from './Tilcayo'

// El tilcayo aparece con su celular, lo desliza y así cambia la pantalla.
// phase: 'in' (sube y desliza) | 'out' (baja mientras entra la pantalla nueva)
export default function Transicion({ label, phase }) {
  return (
    <div className={`tcambio is-${phase}`} aria-live="polite">
      <span className="tcambio__burbuja glass">→ {label}</span>
      <div className="tcambio__gato">
        <Tilcayo pose="asomado" />
        <span className="tcambio__celular">
          <span className="tcambio__pantalla">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m13 17-5-5 5-5M19 17l-5-5 5-5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
        <span className="tcambio__pata" />
        <svg className="tcambio__deslizar" viewBox="0 0 44 24" aria-hidden="true">
          <path d="m12 18-6-6 6-6" />
          <path d="m24 18-6-6 6-6" opacity="0.65" />
          <path d="m36 18-6-6 6-6" opacity="0.35" />
        </svg>
      </div>
    </div>
  )
}
