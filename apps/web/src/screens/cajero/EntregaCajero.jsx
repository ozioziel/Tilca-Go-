import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import Tilcayo from '../../components/Tilcayo'
import { Button, Chip, Header, Row } from '../../components/ui'
import { errorText, useBackend, usePolling } from '../../lib/backend'
import { useI18n } from '../../i18n'

/**
 * Entrega en el mostrador (lado del cajero). La orden está en IN_HANDOVER:
 * el cajero cuenta el efectivo frente al turista y solo lo entrega cuando
 * ve la liberación (`release`) confirmada en Stellar.
 */
export default function EntregaCajero({ nav, state, setState }) {
  const { t, bs, num } = useI18n()
  const { api, sendTx } = useBackend()
  const [fase, setFase] = useState('')
  const [entregado, setEntregado] = useState(false)
  const [error, setError] = useState('')
  const o = state.order

  usePolling(
    async () => {
      if (!o) return
      const { order } = await api('GET', `/orders/${o.id}`)
      setState((s) => ({ ...s, order }))
    },
    2500,
    Boolean(o) && o?.status === 'IN_HANDOVER',
  )

  if (!o) {
    return (
      <div className="pantalla">
        <Header title={t('entregaC.tituloEspera')} onBack={nav.back} />
      </div>
    )
  }

  const ok = o.status === 'SETTLED'
  const disputa = o.status === 'DISPUTED'
  const release = o.transactions.find((x) => x.kind === 'release' && x.status === 'SUCCESS')

  const firmar = async (action) => {
    setError('')
    try {
      const res = await sendTx(o.id, action, action === 'open_dispute' ? { reason: 'El turista no firma la liberación' } : {}, setFase)
      setState((s) => ({ ...s, order: res.order }))
      if (action === 'cancel_handover') nav.go('inicio', { root: true })
    } catch (err) {
      setError(errorText(err))
    } finally {
      setFase('')
    }
  }

  const terminar = () => {
    setEntregado(true)
    state.refrescarAgente?.().catch(() => {})
    setTimeout(() => nav.go('inicio', { root: true }), 1600)
  }

  const titulo = ok ? t('entregaC.tituloOk') : disputa ? t('orden.DISPUTED') : t('entregaC.tituloEspera')

  return (
    <div className="pantalla">
      <Header title={titulo} onBack={ok || disputa ? () => nav.go('inicio', { root: true }) : undefined} />
      <Chip tone={ok ? 'verde' : 'terracota'}>{ok ? t('entregaC.chipOk') : disputa ? t('entregaC.chipDisputa') : t('entregaC.chipEspera')}</Chip>

      <div className={`glass card stack-4 ${ok ? 'entra' : 'flota flota--suave'}`}>
        <span className="overline">{ok ? t('entregaC.labelOk') : t('entregaC.labelEspera')}</span>
        <strong className="display-l text-terra">{bs(Number(o.net_bob))}</strong>
        <span className="body-s muted">
          {ok ? t('entregaC.subOk', { usdc: num(o.agent_receives_usdc) }) : disputa ? t('entregaC.subDisputa') : t('entregaC.subEspera')}
        </span>
      </div>

      <div className="glass card perfil__tarjeta entra" style={{ '--i': 1 }}>
        <span className="avatar avatar--chico">{o.tourist_email.slice(0, 1).toUpperCase()}</span>
        <span className="stack-4">
          <strong className="label-m">{o.tourist_email}</strong>
          <span className="body-s muted">{t(`orden.${o.status}`)}</span>
        </span>
      </div>

      <div className="glass card stack-10 entra" style={{ '--i': 2 }}>
        <Row label={t('validar.pago')} value={`${num(o.amount_usdc)} USDC`} />
        <Row label={t('validar.comision')} value={`−${num(o.platform_fee_usdc)} USDC`} />
        <Row label={t('validar.recibes')} value={`${num(o.agent_receives_usdc)} USDC`} strong tone="teal" />
        {release && (
          <div className="row">
            <span className="row__label">{t('validar.tx')}</span>
            <a className="link fila-icono" href={release.url} target="_blank" rel="noreferrer">
              {release.tx_hash.slice(0, 4)}…{release.tx_hash.slice(-4)} <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        )}
      </div>

      {error && <p className="nota nota--error" role="alert">{error}</p>}

      <div className="stack-10">
        {ok ? (
          <>
            <Button disabled={entregado} onClick={terminar}>
              {t('entregaC.hecha')}
            </Button>
            {release && (
              <Button variant="secondary" icon={false} onClick={() => window.open(release.url, '_blank', 'noreferrer')}>
                {t('entregaC.comprobante')}
              </Button>
            )}
          </>
        ) : disputa ? (
          <Button variant="secondary" icon={false} onClick={() => nav.go('inicio', { root: true })}>
            {t('pantalla.inicio')}
          </Button>
        ) : (
          <>
            <Button disabled className="is-cargando" icon={false}>
              {fase ? t(`pagar.fase.${fase}`) : t('entregaC.esperando')}
            </Button>
            <Button variant="secondary" icon={false} disabled={Boolean(fase)} onClick={() => firmar('cancel_handover')}>
              {t('entregaC.cancelar')}
            </Button>
            <button type="button" className="link centrado" disabled={Boolean(fase)} onClick={() => firmar('open_dispute')}>
              {t('entregaC.disputa')}
            </button>
          </>
        )}
      </div>

      {entregado && (
        <div className="exito" role="status">
          <div className="exito__caja glass">
            <Tilcayo pose="feliz" className="exito__gato brinca" />
            <strong className="display-m">{t('validar.entregado')}</strong>
            <span className="body-s muted">{t('entregaC.subOk', { usdc: num(o.agent_receives_usdc) })}</span>
          </div>
        </div>
      )}
    </div>
  )
}
