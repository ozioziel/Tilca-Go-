import { useState } from 'react'
import { DollarSign, Layers, MapPin, Zap } from 'lucide-react'
import { Button, Header, Row } from '../../components/ui'
import { useCountdown, useTimers } from '../../components/hooks'
import { CAJEROS, cotizar, METODOS, METODOS_PRONTO } from '../../data/config'
import { useI18n } from '../../i18n'

export default function Pagar({ nav, state }) {
  const { t, L, bs, num } = useI18n()
  const later = useTimers()
  const tiempo = useCountdown(8 * 60 + 12)
  const [pagando, setPagando] = useState(false)
  const q = cotizar(state.usd)
  const cajero = CAJEROS.find((c) => c.id === state.cajeroId) ?? CAJEROS[0]
  const usdc = METODOS[0]

  // Simula la firma en la wallet y la confirmación del depósito en el escrow
  const pagar = () => {
    setPagando(true)
    later(() => nav.go('codigo'), 1300)
  }

  return (
    <div className="pantalla">
      <Header title={t('pagar.titulo')} onBack={nav.back} />

      <div className="glass card stack-10 entra" style={{ '--i': 0 }}>
        <Row label={t('cotizar.envias')} value={`${num(q.usd)} USDC`} />
        <Row label={t('cotizar.comision')} value={bs(q.comision)} />
        <Row label={t('cotizar.red')} value={t('comun.gratis')} tone="teal" />
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
        <button type="button" role="radio" aria-checked="true" className="metodo glass entra-lado is-selected" style={{ '--i': 0 }}>
          <span className="metodo__icono">
            <DollarSign size={18} aria-hidden="true" />
          </span>
          <span className="metodo__texto">
            <strong>{usdc.titulo}</strong>
            <span>{L(usdc.sub)}</span>
          </span>
          <span className="radio" aria-hidden="true" />
        </button>
        <div className="metodo glass entra-lado is-disabled" style={{ '--i': 1 }} aria-disabled="true">
          <span className="metodo__icono">
            <Layers size={18} aria-hidden="true" />
          </span>
          <span className="metodo__texto">
            <strong>{L(METODOS_PRONTO.titulo)}</strong>
            <span>{L(METODOS_PRONTO.sub)}</span>
          </span>
        </div>
      </div>

      <div className="nota nota--verde flota flota--suave">
        <Zap size={18} aria-hidden="true" />
        <span>{t('pagar.stellar', { time: tiempo })}</span>
      </div>

      <Button disabled={pagando || q.usd <= 0} onClick={pagar} className={pagando ? 'is-cargando' : ''} icon={!pagando}>
        {pagando ? t('pagar.procesando') : t('pagar.pagar', { amount: `${num(q.usd)} USDC` })}
      </Button>
    </div>
  )
}
