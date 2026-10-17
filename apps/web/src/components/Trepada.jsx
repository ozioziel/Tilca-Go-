import { useEffect, useRef } from 'react'
import Tilcayo from './Tilcayo'
import { useI18n } from '../i18n'

const W = 56
const H = 83

/**
 * Entrada animada de Inicio: el tilcayo aparece abajo, trepa saltando por los
 * botones (accesos rápidos, «Retirar efectivo», tarjeta de saldo) y llega al logo.
 * `targets` son refs a esos elementos; `onDone` se llama al terminar o al saltarla.
 */
export default function Trepada({ containerRef, targets, onDone }) {
  const { t } = useI18n()
  const el = useRef(null)
  const anim = useRef(null)

  // useEffect (no useLayoutEffect): así las refs del contenedor y de los botones ya están conectadas
  useEffect(() => {
    const root = containerRef.current
    const node = el.current
    if (!root || !node || !node.animate) {
      onDone()
      return
    }
    const cr = root.getBoundingClientRect()
    const phone = root.closest('.phone')?.getBoundingClientRect()
    const bottom = (phone ? phone.bottom : window.innerHeight) - cr.top
    const at = (ref, fx, fy, dy) => {
      const r = ref.current?.getBoundingClientRect()
      if (!r) return null
      return { x: r.left - cr.left + r.width * fx, y: r.top - cr.top + r.height * fy + dy }
    }
    const fallback = { x: cr.width / 2, y: bottom - 140 }
    const points = [
      { x: cr.width / 2, y: bottom - 40 },
      { x: cr.width / 2, y: bottom - 150 },
      at(targets.tiles, 0.88, 0, -34) ?? fallback,
      at(targets.cta, 0.18, 0, -30) ?? fallback,
      at(targets.card, 0.8, 0, -28) ?? fallback,
      at(targets.logo, 0.22, 0.5, -6) ?? { x: 40, y: 80 },
    ]
    const offsets = [0, 0.14, 0.36, 0.56, 0.78, 1]
    const frames = points.map((p, i) => ({
      transform: `translate(${p.x - W / 2}px, ${p.y - H / 2}px) scale(${i === points.length - 1 ? 0.6 : 1})`,
      opacity: i === 0 || i === points.length - 1 ? 0 : 1,
      offset: offsets[i],
      easing: 'cubic-bezier(.3, 1.45, .55, 1)',
    }))
    anim.current = node.animate(frames, { duration: 2400, fill: 'forwards' })
    anim.current.onfinish = onDone
    return () => anim.current?.cancel()
    // Se calcula una sola vez al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <button type="button" className="trepada" onClick={() => anim.current?.finish()} aria-label={t('comun.saltar')}>
      <span ref={el} className="trepada__gato">
        <Tilcayo pose="trepando" />
      </span>
      <span className="trepada__hint glass">{t('comun.saltar')}</span>
    </button>
  )
}
