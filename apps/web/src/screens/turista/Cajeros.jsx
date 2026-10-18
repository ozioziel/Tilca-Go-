import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Clock, MapPin, Navigation, ShieldCheck, Star } from 'lucide-react'
import Mapa from '../../components/Mapa'
import { Button, Chip, IconButton } from '../../components/ui'
import { errorText, useBackend } from '../../lib/backend'
import { useI18n } from '../../i18n'

const ORDEN = {
  cercano: (a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0),
  efectivo: (a, b) => Number(b.cash_available_bob) - Number(a.cash_available_bob),
  valorado: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
}

const iniciales = (n) =>
  n
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

/** Ubica los cajeros en el mapa ilustrado a partir de su latitud y longitud. */
function proyectar(agents) {
  if (!agents.length) return []
  const lats = agents.map((a) => a.lat)
  const lngs = agents.map((a) => a.lng)
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)]
  const span = (a, b) => (b - a > 1e-6 ? b - a : 1)
  return agents.map((a) => ({
    id: a.id,
    nombre: a.name,
    pos: {
      // Margen arriba para no quedar bajo la barra de título y abajo para no quedar bajo la hoja
      x: agents.length === 1 ? 50 : 16 + (68 * (a.lng - minLng)) / span(minLng, maxLng),
      y: agents.length === 1 ? 58 : 46 + (30 * (maxLat - a.lat)) / span(minLat, maxLat),
    },
  }))
}

export default function Cajeros({ nav, state, setState }) {
  const { t, bs, num } = useI18n()
  const { api, user } = useBackend()
  const [agents, setAgents] = useState(state.agents ?? [])
  const [orden, setOrden] = useState('cercano')
  const [error, setError] = useState('')
  const efectivo = state.quote ? Number(state.quote.net_bob) : 0

  useEffect(() => {
    api('GET', '/agents')
      .then((r) => {
        setAgents(r.agents)
        setState((s) => ({ ...s, agents: r.agents }))
      })
      .catch((err) => setError(errorText(err)))
  }, [api, setState])

  // Solo se ofrecen los cajeros que tienen el efectivo de esta cotización
  const conEfectivo = agents.filter((a) => !efectivo || (Number(a.cash_available_bob) >= efectivo && Number(a.max_order_bob) >= efectivo))
  const lista = useMemo(() => [...conEfectivo].sort(ORDEN[orden]), [conEfectivo, orden])
  const elegido = lista.find((a) => a.id === state.agentId) ?? lista[0]
  const elegir = (id) => setState((s) => ({ ...s, agentId: id }))
  const pines = useMemo(() => proyectar(lista), [lista])
  const cerca = lista.filter((a) => (a.distance_m ?? 0) <= 500).length

  const continuar = () => {
    setState((s) => ({ ...s, agentId: elegido.id, order: null, withdrawal: null }))
    if (!state.quote) return nav.go('cotizar')
    if (!user) {
      setState((s) => ({ ...s, despuesDeAcceso: 'pagar' }))
      return nav.go('crear')
    }
    nav.go('pagar')
  }

  return (
    <div className="pantalla pantalla--mapa">
      <Mapa cajeros={pines} selected={elegido?.id} onSelect={elegir} className="cajeros__mapa" />
      <div className="cajeros__arriba">
        <IconButton icon={ChevronLeft} label="Volver" onClick={nav.back} />
        <span className="glass pill-titulo">{t('mapa.titulo')}</span>
      </div>
      <span className="glass pill-dato cajeros__cerca">
        <Navigation size={14} className="text-teal" aria-hidden="true" /> {t('mapa.cercaN', { n: cerca })}
      </span>

      <section className="hoja glass">
        <span className="hoja__asa" aria-hidden="true" />
        <div className="entre">
          <h1 className="h-s">{t('mapa.cajerosCerca', { n: lista.length })}</h1>
          {efectivo > 0 && <span className="label-s muted">{t('mapa.retiras', { amount: bs(efectivo) })}</span>}
        </div>
        <div className="filtros" role="group">
          {['cercano', 'efectivo', 'valorado'].map((o) => (
            <button key={o} type="button" className={`filtro ${orden === o ? 'is-on' : ''}`} onClick={() => setOrden(o)}>
              {t(`mapa.${o}`)}
            </button>
          ))}
        </div>
        {error && <p className="nota nota--error" role="alert">{error}</p>}
        {!error && lista.length === 0 && <p className="body-s muted centrado">{t('mapa.ninguno')}</p>}
        <div className="stack-10">
          {lista.map((c, i) => (
            <button key={c.id} type="button" className={`cajero glass entra ${c.id === elegido?.id ? 'is-selected' : ''}`} style={{ '--i': i }} onClick={() => elegir(c.id)}>
              <span className="cajero__ini">{iniciales(c.name)}</span>
              <span className="cajero__datos">
                <strong>{c.name}</strong>
                <span className="fila-icono body-s muted">
                  <MapPin size={13} aria-hidden="true" /> {c.zone ?? c.address} · {c.distance_m} m
                </span>
                <span className="fila-icono label-s muted">
                  {c.rating && (
                    <>
                      <Star size={12} className="text-terra estrella" aria-hidden="true" /> {c.rating} ·
                    </>
                  )}
                  <Clock size={12} aria-hidden="true" /> {c.hours}
                </span>
                <Chip>{t('mapa.disp', { amount: `Bs ${num(c.cash_available_bob)}` })}</Chip>
              </span>
            </button>
          ))}
        </div>
        {elegido && (
          <>
            <div className="nota nota--verde">
              <ShieldCheck size={18} aria-hidden="true" />
              <span>{t('mapa.reserva', { amount: bs(efectivo) })}</span>
            </div>
            <Button onClick={continuar}>{t('mapa.continuar', { name: elegido.name.split(' ')[0] })}</Button>
          </>
        )}
      </section>
    </div>
  )
}
