import { useState } from 'react'
import { ArrowUpDown, Check, ChevronDown, DollarSign, Wallet } from 'lucide-react'
import { Button, Chip, Header, Row } from '../../components/ui'
import { useCountdown } from '../../components/hooks'
import { cotizar, FEE, RATE, TASA_FIJA_MIN } from '../../data/config'
import { useI18n } from '../../i18n'

const limpiar = (v) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 9)

export default function Cotizar({ nav, state, setState }) {
  const { t, bs, num } = useI18n()
  const tiempo = useCountdown(TASA_FIJA_MIN * 60 - 18)
  // Se puede escribir en dólares o en bolivianos; el botón del medio cambia el campo editable
  const [enBs, setEnBs] = useState(false)
  const [giro, setGiro] = useState(0)
  const [textoBs, setTextoBs] = useState(() => cotizar(state.usd).efectivo.toFixed(2))
  const [textoUsd, setTextoUsd] = useState(() => String(state.usd))
  const q = cotizar(state.usd)

  const cambiarUsd = (v) => {
    const s = limpiar(v)
    setTextoUsd(s)
    setState((st) => ({ ...st, usd: Number(s) || 0 }))
  }
  const cambiarBs = (v) => {
    const s = limpiar(v)
    setTextoBs(s)
    const usd = (Number(s) || 0) / (RATE * (1 - FEE))
    setState((st) => ({ ...st, usd: Math.round(usd * 100) / 100 }))
  }

  return (
    <div className="pantalla">
      <Header title={t('cotizar.titulo')} onBack={nav.back} />

      <div className="glass card stack-4 entra" style={{ '--i': 0 }}>
        <div className="entre">
          <span className="overline">{t('cotizar.tipo')}</span>
          <Chip>{t('cotizar.fija', { time: tiempo })}</Chip>
        </div>
        <strong className="display-m">1 USD = {RATE} Bs</strong>
        <span className="body-s muted">{t('cotizar.fijaNota')}</span>
      </div>

      <div className="calc">
        <label className="calc__campo glass flota flota--suave">
          <span className="calc__monto">
            <span className="overline">{t('cotizar.envias')}</span>
            <input
              className="calc__input"
              inputMode="decimal"
              value={enBs ? num(q.usd) : textoUsd}
              readOnly={enBs}
              onChange={(e) => cambiarUsd(e.target.value)}
              aria-label={t('cotizar.envias')}
            />
          </span>
          <span className="moneda">
            <span className="moneda__icono"><DollarSign size={14} /></span>
            USDC <ChevronDown size={14} aria-hidden="true" />
          </span>
        </label>
        <button
          type="button"
          className="calc__swap"
          style={{ '--giro': `${giro}deg` }}
          onClick={() => {
            setEnBs((v) => !v)
            setGiro((g) => g + 180)
            setTextoBs(q.efectivo.toFixed(2))
            setTextoUsd(String(q.usd))
          }}
          aria-label="Intercambiar"
        >
          <ArrowUpDown size={16} />
        </button>
        <label className="calc__campo glass flota flota--suave" style={{ '--retraso': '1.1s' }}>
          <span className="calc__monto">
            <span className="overline">{t('cotizar.recibes')}</span>
            <input
              className="calc__input"
              inputMode="decimal"
              value={enBs ? textoBs : num(q.efectivo)}
              readOnly={!enBs}
              onChange={(e) => cambiarBs(e.target.value)}
              aria-label={t('cotizar.recibes')}
            />
          </span>
          <span className="moneda">
            <span className="moneda__icono"><Wallet size={14} /></span>
            BOB <ChevronDown size={14} aria-hidden="true" />
          </span>
        </label>
      </div>

      <div className="glass card stack-10 entra" style={{ '--i': 1 }}>
        <Row label={t('cotizar.tipo')} value={`1 USD = ${RATE} Bs`} />
        <Row label={t('cotizar.comision')} value={bs(q.comision)} />
        <Row label={t('cotizar.red')} value="< Bs 0.01" />
        <hr className="divisor" />
        <Row label={t('cotizar.total')} value={bs(q.efectivo)} strong tone="terra" />
      </div>

      {q.ahorro > 0 && (
        <div className="nota nota--verde flota flota--suave">
          <Check size={18} aria-hidden="true" />
          <span>{t('cotizar.ahorro', { amount: bs(q.ahorro) })}</span>
        </div>
      )}

      <Button disabled={q.usd <= 0} onClick={() => nav.go('cajeros')}>
        {t('cotizar.elegir')}
      </Button>
    </div>
  )
}
