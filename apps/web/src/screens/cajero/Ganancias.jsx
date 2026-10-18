import { useState } from 'react'
import { Zap } from 'lucide-react'
import Fila from '../../components/Fila'
import { Chip } from '../../components/ui'
import { useBackend, usePolling } from '../../lib/backend'
import { shortAddress } from '../../lib/wallet'
import { useI18n } from '../../i18n'

const DIAS = { es: ['D', 'L', 'M', 'M', 'J', 'V', 'S'], en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'] }

/** Comisiones del cajero en los últimos 7 días, a partir de sus órdenes liquidadas. */
export default function Ganancias({ state }) {
  const { t, bs, num, lang } = useI18n()
  const { api, rate } = useBackend()
  const [ordenes, setOrdenes] = useState([])

  usePolling(async () => {
    const r = await api('GET', '/orders')
    setOrdenes(r.orders.filter((o) => o.agent.id === state.agent?.id && o.status === 'SETTLED'))
  }, 10000, Boolean(state.agent))

  // Últimos 7 días, de hace 6 días a hoy
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy)
    d.setDate(d.getDate() - (6 - i))
    const delDia = ordenes.filter((o) => new Date(o.created_at).toDateString() === d.toDateString())
    return {
      fecha: d,
      letra: DIAS[lang === 'en' ? 'en' : 'es'][d.getDay()],
      usdc: delDia.reduce((s, o) => s + Number(o.agent_fee_usdc), 0),
      recibido: delDia.reduce((s, o) => s + Number(o.agent_receives_usdc), 0),
      n: delDia.length,
    }
  })
  const total = dias.reduce((s, d) => s + d.usdc, 0)
  const entregas = dias.reduce((s, d) => s + d.n, 0)
  const max = Math.max(...dias.map((d) => d.usdc), 0.01)
  const tasa = rate ? Number(rate.rate_applied_bob) : 0

  return (
    <div className="pantalla">
      <div className="entre">
        <h1 className="display-m">{t('ganancias.titulo')}</h1>
        <Chip tone="beige">{t('ganancias.ultimos')}</Chip>
      </div>

      <div className="glass card stack-4">
        <span className="overline">{t('ganancias.semana')}</span>
        <strong className="display-m">{num(total)} USDC</strong>
        <span className="body-s muted">{t('ganancias.retiros', { amount: bs(total * tasa), n: entregas })}</span>
        <div className="grafico" role="img" aria-label={`${num(total)} USDC`}>
          {dias.map((d, i) => (
            <div key={i} className={`grafico__col ${i === 6 ? 'is-hoy' : ''}`} style={{ '--i': i }}>
              <span className="grafico__valor">{d.usdc.toFixed(1)}</span>
              <span className="grafico__barra" style={{ height: `${Math.max(4, Math.round((d.usdc / max) * 86))}px` }} />
              <span className="grafico__dia">{d.letra}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="nota nota--verde flota flota--suave">
        <Zap size={18} aria-hidden="true" />
        <span>{t('ganancias.liq', { wallet: shortAddress(state.agent?.wallet_address) })}</span>
      </div>

      <section className="stack-8">
        <span className="overline">{t('ganancias.liquidaciones')}</span>
        <div className="glass card card--lista">
          {entregas === 0 && <p className="body-s muted centrado">{t('cajero.sinOrdenes')}</p>}
          {[...dias]
            .reverse()
            .filter((d) => d.n > 0)
            .map((d, i) => (
              <Fila
                key={d.fecha.toISOString()}
                i={i}
                estado="retirado"
                titulo={d.fecha.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-BO', { weekday: 'short', day: 'numeric', month: 'short' })}
                detalle={t('cajero.entregas', { n: d.n })}
                monto={`+${num(d.recibido)} USDC`}
                chip={t('ganancias.recibido')}
              />
            ))}
        </div>
      </section>
    </div>
  )
}
