import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { App as NativeApp } from '@capacitor/app'
import { Signal, Wifi, BatteryFull } from 'lucide-react'
import Paisaje from './Paisaje'
import Transicion from './Transicion'
import { TabBar, Toast } from './ui'
import { useI18n } from '../i18n'
import { useReducedMotion, useTimers } from './hooks'
import { isNative } from '../lib/platform'

/**
 * Contenedor de una app (turista o cajero): fondo andino, pila de pantallas,
 * menú inferior y la transición donde el tilcayo cambia la pantalla.
 *
 * nav.go(id, { root, replace, plain }) avanza con la animación del tilcayo.
 * nav.back() vuelve directo, sin animación larga, para no frenar la navegación.
 */
export default function PhoneApp({ screens, initial, tabs, state, setState }) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const later = useTimers()
  const [stack, setStack] = useState([initial])
  const [mode, setMode] = useState('fade') // idle | leaving | entering | back | fade
  const [cat, setCat] = useState(null) // { label, phase }
  const [toastMsg, setToastMsg] = useState('')
  const busy = useRef(false)
  // Si se toca algo mientras el tilcayo cambia la pantalla, se ejecuta al terminar (no se pierde el toque)
  const pendiente = useRef(null)
  const goRef = useRef(null)
  const toastTimer = useRef(null)

  const top = stack[stack.length - 1]
  const Screen = screens[top]

  const apply = (to, opts) =>
    setStack((s) => (opts.root ? [to] : opts.replace ? [...s.slice(0, -1), to] : [...s, to]))

  const go = useCallback(
    (to, opts = {}) => {
      if (busy.current) {
        pendiente.current = { to, opts }
        return
      }
      if (reduce || opts.plain) {
        apply(to, opts)
        setMode('fade')
        return
      }
      busy.current = true
      setCat({ label: t(`pantalla.${to}`), phase: 'in' })
      setMode('leaving')
      later(() => {
        apply(to, opts)
        setMode('entering')
        setCat((c) => c && { ...c, phase: 'out' })
      }, 330)
      later(() => setCat(null), 600)
      later(() => {
        setMode('idle')
        busy.current = false
        const next = pendiente.current
        pendiente.current = null
        if (next) goRef.current?.(next.to, next.opts)
      }, 680)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reduce, t],
  )

  goRef.current = go

  const back = useCallback(() => {
    if (busy.current) return
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
    setMode('back')
  }, [])

  const toast = useCallback((msg) => {
    setToastMsg(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(''), 2200)
  }, [])

  const nav = useMemo(() => ({ go, back, top }), [go, back, top])

  // Botón «atrás» de Android: vuelve una pantalla; en la primera, cierra la app
  const stackLen = useRef(stack.length)
  stackLen.current = stack.length
  useEffect(() => {
    if (!isNative) return
    const handle = NativeApp.addListener('backButton', () => {
      if (stackLen.current > 1) back()
      else NativeApp.exitApp()
    })
    return () => {
      handle.then((h) => h.remove())
    }
  }, [back])
  const activeTab = tabs?.map[top]

  return (
    <div className="phone">
      <Paisaje />
      <div className="phone__status" aria-hidden="true">
        <span>9:41</span>
        <span className="phone__status-icons">
          <Signal size={14} />
          <Wifi size={14} />
          <BatteryFull size={16} />
        </span>
      </div>
      <main key={`${top}-${stack.length}`} className={`screen is-${mode} ${activeTab ? 'has-tabbar' : ''}`}>
        <Screen nav={nav} state={state} setState={setState} toast={toast} />
      </main>
      {activeTab && (
        <TabBar
          items={tabs.items.map((it) => ({ ...it, label: t(it.label) }))}
          active={activeTab}
          onSelect={(id) => {
            const target = tabs.target[id]
            // Las pantallas con menú inferior reinician la pila; las demás se apilan para poder volver
            if (target) go(target, { root: Boolean(tabs.map[target]) })
            else toast(t('comun.pronto'))
          }}
        />
      )}
      {cat && <Transicion label={cat.label} phase={cat.phase} />}
      <Toast message={toastMsg} />
    </div>
  )
}
