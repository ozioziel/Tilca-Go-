import { useEffect, useState } from 'react'
import { ChevronRight, DollarSign, Layers, MapPin, Wallet, Zap } from 'lucide-react'
import { Button, Header, Row } from '../../components/ui'
import { errorText, useBackend } from '../../lib/backend'
import { shortAddress } from '../../lib/wallet'
import { METODOS, METODOS_PRONTO } from '../../data/config'
import { useWalletChecks } from '../comun/Wallet'
import { useI18n } from '../../i18n'

/** Cuenta regresiva hasta `iso` en mm:ss. */
function useRestante(iso) {
  const calc = () => Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000))
  const [left, setLeft] = useState(calc)
  useEffect(() => {
    setLeft(calc())
    const id = setInterval(() => setLeft(calc()), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso])
  return { left, text: `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}` }
}

/**
 * Confirmar y pagar: crea la orden (reserva el efectivo), arma el depósito al
 * escrow, lo firma la wallet y TilcaGo lo envía pagando la comisión de red.
 */
export default function Pagar({ nav, state, setState }) {
  const { t, L, bs, num } = useI18n()
  const { api, wallet, sendTx } = useBackend()
  const checks = useWalletChecks()
  const [fase, setFase] = useState('') // creando | preparando | firmando | enviando | codigo
  const [error, setError] = useState('')
  const quote = state.quote
  const agente = state.agents?.find((a) => a.id === state.agentId)
  const tiempo = useRestante(quote?.expires_at ?? new Date().toISOString())
  const vencida = tiempo.left === 0
  const usdc = METODOS[0]

  if (!quote || !agente) {
    return (
      <div className="pantalla">
        <Header title={t('pagar.titulo')} onBack={nav.back} />
        <p className="body-m muted centrado">{t('pagar.sinCotizacion')}</p>
        <Button onClick={() => nav.go('cotizar', { replace: true })}>{t('inicio.cotizar')}</Button>
      </div>
    )
  }

  const recotizar = async () => {
    const nueva = await api('GET', `/quotes?amount_usdc=${Number(quote.amount_usdc)}`)
    setState((s) => ({ ...s, quote: nueva, order: null }))
  }

  const pagar = async () => {
    setError('')
    if (!checks.lista) {
      setState((s) => ({ ...s, despuesDeWallet: 'pagar' }))
      return nav.go('wallet')
    }
    try {
      let order = state.order
      if (!order || order.status !== 'AWAITING_PAYMENT' || order.tourist_wallet !== wallet.address) {
        setFase('creando')
        order = (await api('POST', '/orders', { quote_id: quote.id, agent_id: agente.id, wallet_address: wallet.address })).order
        setState((s) => ({ ...s, order }))
      }
      const res = await sendTx(order.id, 'deposit', {}, setFase)
      setFase('codigo')
      const withdrawal = await api('POST', `/orders/${order.id}/withdrawal-code`)
      setState((s) => ({ ...s, order: res.order, withdrawal }))
      nav.go('codigo')
    } catch (err) {
      setError(errorText(err))
      setFase('')
      if (err.code === 'quote_expired' || err.code === 'quote_used') recotizar().catch(() => {})
    }
  }

  const ocupado = Boolean(fase)
  const etiqueta = ocupado ? t(`pagar.fase.${fase}`) : vencida ? t('pagar.recotizar') : t('pagar.pagar', { amount: `${num(quote.amount_usdc)} USDC` })

  return (
    <div className="pantalla">
      <Header title={t('pagar.titulo')} onBack={nav.back} />

      <div className="glass card stack-10 entra" style={{ '--i': 0 }}>
        <Row label={t('cotizar.envias')} value={`${num(quote.amount_usdc)} USDC`} />
        <Row label={t('cotizar.comision')} value={`${num(quote.fee_usdc)} USDC`} />
        <Row label={t('cotizar.red')} value={t('comun.gratis')} tone="teal" />
        <Row label={t('cotizar.recibes')} value={bs(Number(quote.net_bob))} strong tone="terra" />
        <hr className="divisor" />
        <div className="cajero-resumen">
          <span className="icono-redondo tono-verde">
            <MapPin size={18} aria-hidden="true" />
          </span>
          <span className="cajero__datos">
            <strong>{agente.name}</strong>
            <span className="body-s muted">
              {agente.address} · {agente.distance_m} m
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

      <button type="button" className="metodo glass entra-lado" style={{ '--i': 2 }} onClick={() => nav.go('wallet')}>
        <span className="metodo__icono">
          <Wallet size={18} aria-hidden="true" />
        </span>
        <span className="metodo__texto">
          <strong>{wallet.address ? `${wallet.kind === 'device' ? t('pagar.walletDispositivo') : 'Freighter'} · ${shortAddress(wallet.address)}` : t('pagar.conectarWallet')}</strong>
          <span>{checks.lista ? t('pagar.walletLista', { asset: checks.asset }) : t('pagar.walletFalta')}</span>
        </span>
        <ChevronRight size={18} className="muted" aria-hidden="true" />
      </button>

      <div className="nota nota--verde flota flota--suave">
        <Zap size={18} aria-hidden="true" />
        <span>{t('pagar.stellar', { time: tiempo.text })}</span>
      </div>

      {error && <p className="nota nota--error" role="alert">{error}</p>}

      <Button
        disabled={ocupado}
        onClick={vencida ? () => recotizar().catch((e) => setError(errorText(e))) : pagar}
        className={ocupado ? 'is-cargando' : ''}
        icon={!ocupado}
      >
        {etiqueta}
      </Button>
    </div>
  )
}
