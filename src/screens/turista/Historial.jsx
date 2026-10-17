import { useState } from 'react'
import { Search } from 'lucide-react'
import Fila from '../../components/Fila'
import { Chip, IconButton } from '../../components/ui'
import { MOVIMIENTOS } from '../../data/config'
import { useI18n } from '../../i18n'

const FILTROS = [
  { id: 'todos', key: 'hist.todos', test: () => true },
  { id: 'retirado', key: 'hist.filtroRetirados', test: (m) => m.estado === 'retirado' },
  { id: 'pendiente', key: 'hist.filtroPendientes', test: (m) => m.estado === 'pendiente' },
  { id: 'reembolsado', key: 'hist.filtroReembolsos', test: (m) => m.estado === 'reembolsado' },
]

export default function Historial({ nav, toast }) {
  const { t, L } = useI18n()
  const [filtro, setFiltro] = useState('todos')
  const f = FILTROS.find((x) => x.id === filtro)
  const visibles = MOVIMIENTOS.filter(f.test)
  const grupos = [
    { id: 'hoy', titulo: t('hist.hoy') },
    { id: 'semana', titulo: t('hist.semana') },
  ]

  return (
    <div className="pantalla">
      <div className="entre">
        <h1 className="display-m">{t('hist.titulo')}</h1>
        <IconButton icon={Search} label="Buscar" onClick={() => toast(t('comun.pronto'))} />
      </div>

      <div className="glass card stack-4 flota flota--suave">
        <span className="overline">{t('hist.mes')}</span>
        <strong className="display-m">Bs 1,371.12</strong>
        <span className="body-s muted">{t('hist.retirados')}</span>
        <Chip className="mt-8">{t('hist.ahorraste')}</Chip>
      </div>

      <div className="filtros filtros--scroll" role="group">
        {FILTROS.map((x) => (
          <button key={x.id} type="button" className={`filtro ${filtro === x.id ? 'is-on' : ''}`} onClick={() => setFiltro(x.id)}>
            {t(x.key)}
          </button>
        ))}
      </div>

      {visibles.length === 0 && <p className="body-s muted centrado">{t('hist.vacio')}</p>}

      {grupos.map((g) => {
        const items = visibles.filter((m) => m.grupo === g.id)
        if (!items.length) return null
        return (
          <section key={`${g.id}-${filtro}`} className="stack-8">
            <span className="overline">{g.titulo}</span>
            <div className="glass card card--lista">
              {items.map((m, i) => (
                <Fila
                  key={m.id}
                  i={i}
                  estado={m.estado}
                  titulo={L(m.titulo)}
                  detalle={L(m.detalle)}
                  monto={m.monto}
                  chip={t(`estado.${m.estado}`)}
                  onClick={m.estado === 'pendiente' ? () => nav.go('codigo') : undefined}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
