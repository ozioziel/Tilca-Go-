import { useMemo, useState } from 'react'
import { ChevronLeft, MapPin, Navigation, ShieldCheck, Star } from 'lucide-react'
import Mapa from '../../components/Mapa'
import { Button, Chip, IconButton } from '../../components/ui'
import { CAJEROS, cotizar } from '../../data/config'
import { useI18n } from '../../i18n'

const ORDEN = {
  cercano: (a, b) => a.distancia - b.distancia,
  efectivo: (a, b) => b.efectivo - a.efectivo,
  valorado: (a, b) => b.rating - a.rating,
}

export default function Cajeros({ nav, state, setState }) {
  const { t, bs } = useI18n()
  const [orden, setOrden] = useState('cercano')
  const q = cotizar(state.usd)
  const lista = useMemo(() => [...CAJEROS].sort(ORDEN[orden]), [orden])
  const elegido = CAJEROS.find((c) => c.id === state.cajeroId) ?? CAJEROS[0]
  const elegir = (id) => setState((s) => ({ ...s, cajeroId: id }))

  return (
    <div className="pantalla pantalla--mapa">
      <Mapa cajeros={CAJEROS} selected={elegido.id} onSelect={elegir} className="cajeros__mapa" />
      <div className="cajeros__arriba">
        <IconButton icon={ChevronLeft} label="Volver" onClick={nav.back} />
        <span className="glass pill-titulo">{t('mapa.titulo')}</span>
      </div>
      <span className="glass pill-dato cajeros__cerca">
        <Navigation size={14} className="text-teal" aria-hidden="true" /> {t('mapa.cerca')}
      </span>

      <section className="hoja glass">
        <span className="hoja__asa" aria-hidden="true" />
        <div className="entre">
          <h1 className="h-s">{t('mapa.cajerosCerca', { n: CAJEROS.length })}</h1>
          <span className="label-s muted">{t('mapa.retiras', { amount: bs(q.efectivo) })}</span>
        </div>
        <div className="filtros" role="group">
          {['cercano', 'efectivo', 'valorado'].map((o) => (
            <button key={o} type="button" className={`filtro ${orden === o ? 'is-on' : ''}`} onClick={() => setOrden(o)}>
              {t(`mapa.${o}`)}
            </button>
          ))}
        </div>
        <div className="stack-10">
          {lista.map((c, i) => (
            <button key={c.id} type="button" className={`cajero glass entra ${c.id === elegido.id ? 'is-selected' : ''}`} style={{ '--i': i }} onClick={() => elegir(c.id)}>
              <span className="cajero__ini">{c.ini}</span>
              <span className="cajero__datos">
                <strong>{c.nombre}</strong>
                <span className="fila-icono body-s muted">
                  <MapPin size={13} aria-hidden="true" /> {c.zona} · {c.distancia} m
                </span>
                <span className="fila-icono label-s muted">
                  <Star size={12} className="text-terra estrella" aria-hidden="true" /> {c.rating} · {t('mapa.retiros', { n: c.retiros })}
                </span>
                <Chip>{t('mapa.disp', { amount: `Bs ${c.efectivo.toLocaleString('en-US')}` })}</Chip>
              </span>
            </button>
          ))}
        </div>
        <div className="nota nota--verde">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>{t('mapa.reserva', { amount: bs(q.efectivo) })}</span>
        </div>
        <Button onClick={() => nav.go('pagar')}>{t('mapa.continuar', { name: elegido.nombre.split(' ')[0] })}</Button>
      </section>
    </div>
  )
}
