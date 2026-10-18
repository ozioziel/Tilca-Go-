import { useEffect, useRef, useState } from 'react'
import { Copy, ExternalLink, X } from 'lucide-react'
import Tilcayo from '../../components/Tilcayo'
import { Listo, RealQR } from '../../components/QR'
import { Button, Chip, Header, Row } from '../../components/ui'
import { errorText, useBackend, usePolling } from '../../lib/backend'
import { useI18n } from '../../i18n'

/**
 * Código de retiro (QR + PIN). El código solo identifica la orden; el pago se libera
 * cuando el turista firma en el mostrador. Cuando el cajero inicia la entrega
 * (la orden pasa a IN_HANDOVER) la app avanza sola a la pantalla de entrega.
 */
export default function Codigo({ nav, state, setState, toast }) {
  const { t, bs, lang } = useI18n()
  const { api } = useBackend()
  const [error, setError] = useState('')
  const order = state.order
  const w = state.withdrawal
  const avanzo = useRef(false)

  // Si se entra desde el historial, se emite un código nuevo (el anterior queda revocado)
  useEffect(() => {
    if (!order || w || order.status !== 'PAID_IN_ESCROW') return
    api('POST', `/orders/${order.id}/withdrawal-code`)
      .then((withdrawal) => setState((s) => ({ ...s, withdrawal })))
      .catch((err) => setError(errorText(err)))
  }, [order, w, api, setState])

  usePolling(
    async () => {
      if (!order) return
      const { order: fresh } = await api('GET', `/orders/${order.id}`)
      setState((s) => ({ ...s, order: fresh }))
      if (fresh.status === 'IN_HANDOVER' && !avanzo.current) {
        avanzo.current = true
        toast(t('codigo.escaneadoAviso'))
        nav.go('entrega', { replace: true })
      }
    },
    3000,
    Boolean(order),
  )

  if (!order) {
    return (
      <div className="pantalla">
        <Header title={t('pantalla.codigo')} onBack={nav.back} />
        <p className="body-m muted centrado">{t('codigo.sinOrden')}</p>
        <Button onClick={() => nav.go('cotizar')}>{t('inicio.retirar')}</Button>
      </div>
    )
  }

  const escaneado = order.withdrawal?.status === 'REDEEMED'
  const deposito = order.transactions.find((x) => x.kind === 'deposit' && x.status === 'SUCCESS')
  const vence = new Date(order.expiry).toLocaleTimeString(lang === 'en' ? 'en-US' : 'es-BO', { hour: '2-digit', minute: '2-digit' })

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(w?.code ?? '')
    } catch {
      /* algunos navegadores bloquean el portapapeles; igual avisamos */
    }
    toast(t('comun.copiado'))
  }

  const comoLlegar = () => {
    const q = encodeURIComponent(`${order.agent.address}, La Paz, Bolivia`)
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noreferrer')
  }

  return (
    <div className="pantalla codigo">
      <Header
        title=""
        onBack={() => nav.go('inicio', { root: true })}
        backIcon={X}
        backLabel="Cerrar"
        right={<span className="screen-header__spacer" />}
      />
      <div className="codigo__cabeza">
        <Tilcayo pose="feliz" className="codigo__gato brinca" />
        <Chip>{t('codigo.confirmado')}</Chip>
        <h1 className="display-m">{t('codigo.titulo')}</h1>
        <p className="body-s muted">{t('codigo.texto')}</p>
      </div>

      <div className="ticket glass">
        <div className="ticket__qr">
          {w ? <RealQR text={w.qr_payload} /> : <span className="ticket__cargando" />}
          {escaneado && <Listo title={t('codigo.listo')} sub={t('codigo.escaneado')} />}
        </div>
        <button type="button" className="ticket__codigo" onClick={copiar} aria-label={t('comun.copiado')}>
          <span className="display-m">{w?.code ?? '···-···'}</span>
          <Copy size={18} aria-hidden="true" />
        </button>
        <hr className="ticket__corte" />
        <div className="stack-10">
          <Row label={t('codigo.monto')} value={bs(Number(order.net_bob))} />
          <Row label={t('codigo.cajero')} value={order.agent.name} />
          <Row label="PIN" value={w?.pin ?? '······'} />
          <Row label={t('codigo.valido')} value={vence} />
          {deposito && (
            <div className="row">
              <span className="row__label">{t('codigo.tx')}</span>
              <a className="link fila-icono" href={deposito.url} target="_blank" rel="noreferrer">
                {deposito.tx_hash.slice(0, 4)}…{deposito.tx_hash.slice(-4)} · stellar.expert <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          )}
        </div>
      </div>

      {error && <p className="nota nota--error" role="alert">{error}</p>}

      <div className="stack-10">
        <Button onClick={comoLlegar}>{t('codigo.llegar')}</Button>
        <Button variant="secondary" icon={false} onClick={copiar}>
          {t('codigo.copiar')}
        </Button>
      </div>
    </div>
  )
}
