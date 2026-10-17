import { forwardRef } from 'react'
import { ArrowRight, ChevronDown, ChevronLeft, CircleHelp } from 'lucide-react'
import Tilcayo from './Tilcayo'
import { useI18n } from '../i18n'

/** Botón con halo que late y destello que lo cruza (variante primary). */
export function Button({ variant = 'primary', icon = true, children, className = '', block = true, ...rest }) {
  return (
    <span className={`btn-wrap ${block ? 'btn-wrap--block' : ''} ${className}`}>
      {variant === 'primary' && <span className="btn__halo" aria-hidden="true" />}
      <button type="button" className={`btn btn--${variant}`} {...rest}>
        {variant === 'primary' && <span className="btn__shine" aria-hidden="true" />}
        <span className="btn__label">{children}</span>
        {icon && <ArrowRight size={18} aria-hidden="true" />}
      </button>
    </span>
  )
}

/** Etiqueta pequeña con punto de color. tone: verde | terracota | beige | oscuro */
export function Chip({ tone = 'verde', children, dot = true, className = '' }) {
  return (
    <span className={`chip chip--${tone} ${className}`}>
      {dot && <span className="chip__dot" aria-hidden="true" />}
      {children}
    </span>
  )
}

export function IconButton({ icon: Icon, label, onClick, className = '', size = 20 }) {
  return (
    <button type="button" className={`icon-btn glass ${className}`} onClick={onClick} aria-label={label} title={label}>
      <Icon size={size} aria-hidden="true" />
    </button>
  )
}

/** Cabecera de pantalla: botón atrás, título y acción opcional a la derecha. */
export function Header({ title, onBack, right, backIcon = ChevronLeft, backLabel = 'Volver' }) {
  return (
    <header className="screen-header">
      {onBack ? <IconButton icon={backIcon} label={backLabel} onClick={onBack} /> : <span className="screen-header__spacer" />}
      <h1 className="screen-header__title">{title}</h1>
      {right ?? <IconButton icon={CircleHelp} label="Ayuda" />}
    </header>
  )
}

/** Menú inferior de vidrio con el círculo de la pestaña activa. */
export function TabBar({ items, active, onSelect }) {
  return (
    <nav className="tabbar glass" aria-label="Menú principal">
      {items.map(({ id, label, Icon }) => {
        const on = id === active
        return (
          <button key={id} type="button" className={`tabbar__item ${on ? 'is-active' : ''}`} onClick={() => !on && onSelect(id)} aria-current={on ? 'page' : undefined}>
            <span className="tabbar__circle">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="tabbar__label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function Field({ label, value, onChange, dropdown = false, readOnly = false, ...rest }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <span className="field__box glass">
        <input className="field__input" value={value} onChange={(e) => onChange?.(e.target.value)} readOnly={readOnly || !onChange} {...rest} />
        {dropdown && <ChevronDown size={18} aria-hidden="true" />}
      </span>
    </label>
  )
}

/** Fila etiqueta–valor de los desgloses. */
export function Row({ label, value, strong = false, tone }) {
  return (
    <div className={`row ${strong ? 'row--strong' : ''}`}>
      <span className="row__label">{label}</span>
      <span className={`row__value ${tone ? `text-${tone}` : ''}`}>{value}</span>
    </div>
  )
}

export function LangToggle({ className = '' }) {
  const { lang, setLang } = useI18n()
  return (
    <div className={`lang glass ${className}`} role="group" aria-label="Idioma / Language">
      {['es', 'en'].map((l) => (
        <button key={l} type="button" className={lang === l ? 'is-on' : ''} onClick={() => setLang(l)} aria-pressed={lang === l}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

/** Logo: el tilcayo echado + «TilcaGo». `catRef` permite animar la llegada del tilcayo. */
export const Logo = forwardRef(function Logo({ hideCat = false, className = '', onClick }, catRef) {
  return (
    <button type="button" className={`logo ${className}`} onClick={onClick} aria-label="TilcaGo">
      <span ref={catRef} className={`logo__cat ${hideCat ? 'is-hidden' : ''}`}>
        <Tilcayo pose="echado" />
      </span>
      <span className={`logo__word ${hideCat ? 'is-hidden' : ''}`}>TilcaGo</span>
    </button>
  )
})

export function Toast({ message }) {
  if (!message) return null
  return (
    <div className="toast glass" role="status">
      <Tilcayo pose="feliz" className="toast__cat" />
      {message}
    </div>
  )
}

/** Separa los saltos de línea `\n` de los textos en <br>. */
export function Lines({ text }) {
  const parts = text.split('\n')
  return parts.map((p, i) => (
    <span key={i}>
      {p}
      {i < parts.length - 1 && <br />}
    </span>
  ))
}
