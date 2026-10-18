import { useState } from 'react'
import { Check, ExternalLink } from 'lucide-react'
import { Button, Chip, Header, Row } from '../../components/ui'
import { errorText, useBackend } from '../../lib/backend'
import { shortAddress } from '../../lib/wallet'
import { useI18n } from '../../i18n'

/**
 * Código válido: el cajero confirma que el turista está presente y firma
 * `start_handover`. Desde ahí el turista ya no puede reembolsarse por su cuenta.
 */
export default function Validar({ nav, state, setState, toast }) {
  const { t, bs, num, lang } = useI18n()
  const { sendTx } = useBackend()
  const [revisado, setRevisado] = useState(false)
  const [fase, setFase] = useState('')
  const [error, setError] = useState('')
  const o = state.order

  if (!o) {
    return (
      <div className="pantalla">
        <Header title={t('validar.titulo')} onBack={nav.back} />
        <Button onClick={() => nav.go('escanear', { replace: true })}>{t('cajero.escanear')}</Button>
      </div>
    )
  }

  const deposito = o.transactions.find((x) => x.kind === 'deposit' && x.status === 'SUCCESS')
  const reservada = new Date(o.created_at).toLocaleTimeString(lang === 'en' ? 'en-US' : 'es-BO', { hour: '2-digit', minute: '2-digit' })

  const iniciar = async () => {
    setError('')
    try {
      const res = await sendTx(o.id, 'start_handover', {}, setFase)
      setState((s) => ({ ...s, order: res.order }))
      nav.go('entregaCajero', { replace: true })
    } catch (err) {
      setError(errorText(err))
      if (err.code === 'wrong_account' || err.code === 'not_connected') {
        setState((s) => ({ ...s, despuesDeWallet: 'validar' }))
      }
    } finally {
      setFase('')
    }
  }

  return (
    <div className="pantalla">
      <Header title={t('validar.titulo')} onBack={nav.back} />
      <Chip>{t('validar.unico')}</Chip>

      <div className="glass card stack-4 flota flota--suave">
        <span className="overline">{t('validar.entrega')}</span>
        <strong className="display-l text-terra">{bs(Number(o.net_bob))}</strong>
        <span className="body-s muted">{t('validar.orden', { code: o.id.slice(0, 8).toUpperCase(), time: reservada })}</span>
      </div>

      <div className="glass card perfil__tarjeta entra" style={{ '--i': 1 }}>
        <span className="avatar avatar--chico">{o.tourist_email.slice(0, 1).toUpperCase()}</span>
        <span className="stack-4">
          <strong className="label-m">{o.tourist_email}</strong>
          <span className="body-s muted">{t('validar.walletTurista', { address: shortAddress(o.tourist_wallet) })}</span>
          <Chip>{t('validar.pagoProtegido')}</Chip>
        </span>
      </div>

      <div className="glass card stack-10 entra" style={{ '--i': 2 }}>
        <Row label={t('validar.pago')} value={`${num(o.amount_usdc)} USDC`} />
        <Row label={t('validar.comision')} value={`−${num(o.platform_fee_usdc)} USDC`} />
        <Row label={t('validar.recibes')} value={`${num(o.agent_receives_usdc)} USDC`} strong tone="teal" />
        {deposito && (
          <div className="row">
            <span className="row__label">{t('validar.tx')}</span>
            <a className="link fila-icono" href={deposito.url} target="_blank" rel="noreferrer">
              {deposito.tx_hash.slice(0, 4)}…{deposito.tx_hash.slice(-4)} <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        )}
        <p className="label-s muted">{t('validar.nota', { fee: num(o.agent_fee_usdc) })}</p>
      </div>

      <label className="casilla">
        <input type="checkbox" checked={revisado} onChange={(e) => setRevisado(e.target.checked)} />
        <span className="casilla__caja" aria-hidden="true">
          <Check size={14} />
        </span>
        <span className="body-s">{t('validar.check')}</span>
      </label>

      {error && (
        <p className="nota nota--error" role="alert">
          {error}{' '}
          {state.despuesDeWallet && (
            <button type="button" className="link" onClick={() => nav.go('wallet')}>
              {t('wallet.titulo')}
            </button>
          )}
        </p>
      )}

      <div className="stack-10">
        <Button disabled={!revisado || Boolean(fase) || o.status !== 'PAID_IN_ESCROW'} onClick={iniciar} className={fase ? 'is-cargando' : ''} icon={!fase}>
          {fase ? t(`pagar.fase.${fase}`) : t('validar.confirmar')}
        </Button>
        <Button variant="secondary" icon={false} onClick={() => toast(t('comun.pronto'))}>
          {t('validar.reportar')}
        </Button>
      </div>
    </div>
  )
}
