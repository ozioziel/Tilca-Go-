import { useState } from 'react'
import { Bitcoin, CreditCard, DollarSign, MapPin, Zap } from 'lucide-react'
import { Button, Header, Row } from '../../components/ui'
import { useCountdown, useTimers } from '../../components/hooks'
import { CAJEROS, cotizar, METODOS } from '../../data/config'
import { useI18n } from '../../i18n'

const ICONOS = { dollar: DollarSign, bitcoin: Bitcoin, card: CreditCard }
const MONEDA = { usdc: 'USDC', usdt: 'USDT', btc: 'USD (BTC)', card: 'USD' }

export default function Pagar({ nav, state, setState }) {
  const { t, L, bs, num } = useI18n()
  const later = useTimers()
  const tiempo = useCountdown(8 * 60 + 12)
  const [pagando, setPagando] = useState(false)
  const q = cotizar(state.usd)
  const cajero = CAJEROS.find((c) => c.id === state.cajeroId) ?? CAJEROS[0]
  const metodo = METODOS.find((m) => m.id === state.metodo) ?? METODOS[0]

  // Simula la confirmación del pago en Stellar antes de mostrar el código
  const pagar = () => {
    setPagando(true)
    later(() => nav.go('codigo'), 1300)
  }

  return (
    <div className="pantalla">
      <Header title={t('pagar.titulo')} onBack={nav.back} />

      <div className="glass card stack-10 entra" style={{ '--i': 0 }}>
        <Row label={t('cotizar.envias')} value={`${num(q.usd)} ${MONEDA[metodo.id]}`} />
        <Row label={t('cotizar.comision')} value={bs(q.comision)} />
        <Row label={t('cotizar.recibes')} value={bs(q.efectivo)} strong tone="terra" />
        <hr className="divisor" />
        <div className="cajero-resumen">
          <span className="icono-redondo tono-verde">
            <MapPin size={18} aria-hidden="true" />
          </span>
          <span className="cajero__datos">
            <strong>{cajero.nombre}</strong>
            <span className="body-s muted">
              {cajero.zona} · {cajero.distancia} m
            </span>
          </span>
          <button type="button" className="link" onClick={nav.back}>
            {t('pagar.cambiar')}
          </button>
        </div>
      </div>

      <span className="overline">{t('pagar.metodo')}</span>
      <div className="stack-8" role="radiogroup" aria-label={t('pagar.metodo')}>
        {METODOS.map((m, i) => {
          const Icon = ICONOS[m.icono]
          const on = m.id === metodo.id
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={on}
              className={`metodo glass entra-lado ${on ? 'is-selected' : ''}`}
              style={{ '--i': i }}
              onClick={() => setState((s) => ({ ...s, metodo: m.id }))}
            >
              <span className="metodo__icono">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="metodo__texto">
                <strong>{m.titulo}</strong>
                <span>{L(m.sub)}</span>
              </span>
              <span className="radio" aria-hidden="true" />
            </button>
          )
        })}
      </div>

      <div className="nota nota--verde flota flota--suave">
        <Zap size={18} aria-hidden="true" />
        <span>{t('pagar.stellar', { time: tiempo })}</span>
      </div>

      <Button disabled={pagando || q.usd <= 0} onClick={pagar} className={pagando ? 'is-cargando' : ''} icon={!pagando}>
        {pagando ? t('pagar.procesando') : t('pagar.pagar', { amount: `${num(q.usd)} ${MONEDA[metodo.id]}` })}
      </Button>
    </div>
  )
}
