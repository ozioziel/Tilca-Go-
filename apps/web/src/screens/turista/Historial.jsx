import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import Fila from '../../components/Fila'
import { Chip, IconButton } from '../../components/ui'
import { errorText, useBackend } from '../../lib/backend'
import { ACTIVAS, ESTADO_FILA, esHoy, fecha } from '../../lib/ordenes'
import { useI18n } from '../../i18n'

const FILTROS = [
  { id: 'todos', key: 'hist.todos', test: () => true },
  { id: 'retirado', key: 'hist.filtroRetirados', test: (o) => ESTADO_FILA[o.status] === 'retirado' },
  { id: 'pendiente', key: 'hist.filtroPendientes', test: (o) => ESTADO_FILA[o.status] === 'pendiente' },
  { id: 'reembolsado', key: 'hist.filtroReembolsos', test: (o) => ESTADO_FILA[o.status] === 'reembolsado' },
]

export default function Historial({ nav, setState }) {
  const { t, num, lang } = useI18n()
  const { api, user } = useBackend()
  const [ordenes, setOrdenes] = useState(null)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('todos')

  const cargar = () =>
    api('GET', '/orders')
      .then((r) => setOrdenes(r.orders))
      .catch((err) => setError(errorText(err)))

  useEffect(() => {
    if (user) cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const f = FILTROS.find((x) => x.id === filtro)
  const visibles = (ordenes ?? []).filter(f.test)
  const retiradas = (ordenes ?? []).filter((o) => o.status === 'SETTLED')
  const totalBs = retiradas.reduce((s, o) => s + Number(o.net_bob), 0)
  const grupos = [
    { id: 'hoy', titulo: t('hist.hoy'), test: (o) => esHoy(o.created_at) },
    { id: 'antes', titulo: t('hist.antes'), test: (o) => !esHoy(o.created_at) },
  ]

  const abrir = (o) => {
    setState((s) => ({ ...s, order: o, withdrawal: null }))
    nav.go(o.status === 'PAID_IN_ESCROW' ? 'codigo' : 'entrega')
  }

  return (
    <div className="pantalla">
      <div className="entre">
        <h1 className="display-m">{t('hist.titulo')}</h1>
        <IconButton icon={RefreshCw} label={t('hist.actualizar')} onClick={cargar} />
      </div>

      <div className="glass card stack-4 flota flota--suave">
        <span className="overline">{t('hist.total')}</span>
        <strong className="display-m">Bs {num(totalBs)}</strong>
        <span className="body-s muted">{t('hist.retiradosN', { n: retiradas.length })}</span>
        <Chip className="mt-8">{t('hist.ahorraste')}</Chip>
      </div>

      <div className="filtros filtros--scroll" role="group">
        {FILTROS.map((x) => (
          <button key={x.id} type="button" className={`filtro ${filtro === x.id ? 'is-on' : ''}`} onClick={() => setFiltro(x.id)}>
            {t(x.key)}
          </button>
        ))}
      </div>

      {!user && <p className="body-s muted centrado">{t('inicio.entraParaVer')}</p>}
      {error && <p className="nota nota--error" role="alert">{error}</p>}
      {ordenes && visibles.length === 0 && <p className="body-s muted centrado">{t('hist.vacio')}</p>}

      {grupos.map((g) => {
        const items = visibles.filter(g.test)
        if (!items.length) return null
        return (
          <section key={`${g.id}-${filtro}`} className="stack-8">
            <span className="overline">{g.titulo}</span>
            <div className="glass card card--lista">
              {items.map((o, i) => (
                <Fila
                  key={o.id}
                  i={i}
                  estado={ESTADO_FILA[o.status]}
                  titulo={o.agent.name}
                  detalle={`${fecha(o.created_at, lang)} · ${num(o.amount_usdc)} USDC`}
                  monto={`Bs ${num(o.net_bob)}`}
                  chip={t(`orden.${o.status}`)}
                  onClick={ACTIVAS.has(o.status) || o.status === 'SETTLED' ? () => abrir(o) : undefined}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
