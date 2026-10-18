import { Zap } from 'lucide-react'
import Fila from '../../components/Fila'
import { Chip } from '../../components/ui'
import { CAJERA, GANANCIAS, PAGOS_RECIBIDOS, RATE } from '../../data/config'
import { useI18n } from '../../i18n'

export default function Ganancias() {
  const { t, L, bs, num } = useI18n()
  const total = GANANCIAS.reduce((s, d) => s + d.usdc, 0)
  const max = Math.max(...GANANCIAS.map((d) => d.usdc))

  return (
    <div className="pantalla">
      <div className="entre">
        <h1 className="display-m">{t('ganancias.titulo')}</h1>
        <Chip tone="beige">{t('ganancias.ultimos')}</Chip>
      </div>

      <div className="glass card stack-4">
        <span className="overline">{t('ganancias.semana')}</span>
        <strong className="display-m">{num(total)} USDC</strong>
        <span className="body-s muted">{t('ganancias.retiros', { amount: bs(total * RATE) })}</span>
        <div className="grafico" role="img" aria-label={`${num(total)} USDC`}>
          {GANANCIAS.map((d, i) => {
            const hoy = i === GANANCIAS.length - 1
            return (
              <div key={i} className={`grafico__col ${hoy ? 'is-hoy' : ''}`} style={{ '--i': i }}>
                <span className="grafico__valor">{d.usdc.toFixed(1)}</span>
                <span className="grafico__barra" style={{ height: `${Math.round((d.usdc / max) * 86)}px` }} />
                <span className="grafico__dia">{L(d.dia)}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="nota nota--verde flota flota--suave">
        <Zap size={18} aria-hidden="true" />
        <span>{t('ganancias.liq', { wallet: CAJERA.wallet })}</span>
      </div>

      <section className="stack-8">
        <span className="overline">{t('ganancias.liquidaciones')}</span>
        <div className="glass card card--lista">
          {PAGOS_RECIBIDOS.map((l, i) => (
            <Fila key={l.id} i={i} estado={l.estado} titulo={L(l.titulo)} detalle={L(l.detalle)} monto={l.monto} chip={L(l.chip)} />
          ))}
        </div>
      </section>
    </div>
  )
}
