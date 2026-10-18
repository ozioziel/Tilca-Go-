import { useState } from 'react'
import Fila from '../../components/Fila'
import { useBackend, usePolling } from '../../lib/backend'
import { ESTADO_FILA, fecha } from '../../lib/ordenes'
import { abrirOrdenCajero } from './InicioCajero'
import { useI18n } from '../../i18n'

const FILTROS = [
  { id: 'activas', key: 'ordenesC.activas', test: (o) => ['AWAITING_PAYMENT', 'PAID_IN_ESCROW', 'IN_HANDOVER', 'DISPUTED'].includes(o.status) },
  { id: 'hechas', key: 'ordenesC.hechas', test: (o) => o.status === 'SETTLED' },
  { id: 'otras', key: 'ordenesC.otras', test: (o) => ['REFUNDED', 'EXPIRED_UNPAID', 'PAYMENT_MISMATCH'].includes(o.status) },
]

/** Todas las órdenes del punto, por estado. */
export default function OrdenesCajero({ nav, state, setState }) {
  const { t, bs, num, lang } = useI18n()
  const { api } = useBackend()
  const [ordenes, setOrdenes] = useState(null)
  const [filtro, setFiltro] = useState('activas')

  usePolling(async () => {
    const r = await api('GET', '/orders')
    setOrdenes(r.orders.filter((o) => o.agent.id === state.agent?.id))
  }, 5000, Boolean(state.agent))

  const f = FILTROS.find((x) => x.id === filtro)
  const visibles = (ordenes ?? []).filter(f.test)

  return (
    <div className="pantalla">
      <h1 className="display-m">{t('ordenesC.titulo')}</h1>
      <div className="filtros" role="group">
        {FILTROS.map((x) => (
          <button key={x.id} type="button" className={`filtro ${filtro === x.id ? 'is-on' : ''}`} onClick={() => setFiltro(x.id)}>
            {t(x.key)}
          </button>
        ))}
      </div>
      {ordenes && visibles.length === 0 && <p className="body-s muted centrado">{t('hist.vacio')}</p>}
      {visibles.length > 0 && (
        <div className="glass card card--lista">
          {visibles.map((o, i) => (
            <Fila
              key={o.id}
              i={i}
              estado={ESTADO_FILA[o.status]}
              titulo={o.tourist_email}
              detalle={`${fecha(o.created_at, lang)} · ${num(o.amount_usdc)} USDC`}
              monto={bs(Number(o.net_bob))}
              chip={t(`orden.${o.status}`)}
              onClick={o.status === 'AWAITING_PAYMENT' ? undefined : () => abrirOrdenCajero(nav, setState, o)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
