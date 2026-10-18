import { useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import Tilcayo from '../../components/Tilcayo'
import PasosEntrega from '../../components/PasosEntrega'
import { Button, Chip, Header, Row } from '../../components/ui'
import { errorText, useBackend, usePolling } from '../../lib/backend'
import { useI18n } from '../../i18n'

/**
 * Entrega en el mostrador (lado del turista). El orden es la regla central de la v3:
 * el cajero cuenta el efectivo a la vista → el turista firma `release` →
 * el cajero ve el pago confirmado on-chain → recién entonces entrega los billetes.
 */
export default function Entrega({ nav, state, setState, toast }) {
  const { t, bs, lang } = useI18n()
  const { api, sendTx } = useBackend()
  const [fase, setFase] = useState('') // preparando | firmando | enviando
  const [error, setError] = useState('')
  const order = state.order

  usePolling(
    async () => {
      if (!order) return
      const { order: fresh } = await api('GET', `/orders/${order.id}`)
      setState((s) => ({ ...s, order: fresh }))
    },
    3000,
    Boolean(order) && !['SETTLED', 'REFUNDED'].includes(order?.status),
  )

  if (!order) {
    return (
      <div className="pantalla">
        <Header title={t('pantalla.entrega')} onBack={nav.back} />
        <p className="body-m muted centrado">{t('codigo.sinOrden')}</p>
      </div>
    )
  }

  const liberado = order.status === 'SETTLED'
  const disputa = order.status === 'DISPUTED'
  const enEntrega = order.status === 'IN_HANDOVER'
  const monto = bs(Number(order.net_bob))
  const release = order.transactions.find((x) => x.kind === 'release' && x.status === 'SUCCESS')
  const tx = release ?? order.transactions.find((x) => x.status === 'SUCCESS')
  const hora = release ? new Date(release.created_at).toLocaleTimeString(lang === 'en' ? 'en-US' : 'es-BO', { hour: '2-digit', minute: '2-digit' }) : ''

  const firmar = async (action, body) => {
    setError('')
    try {
      const res = await sendTx(order.id, action, body, setFase)
      setState((s) => ({ ...s, order: res.order }))
      if (action === 'open_dispute') toast(t('entrega.reportado'))
    } catch (err) {
      setError(errorText(err))
    } finally {
      setFase('')
    }
  }

  const pasos = [
    { label: t('entrega.paso1'), hecho: true },
    { label: liberado ? t('entrega.paso2', { amount: monto }) : t('entrega.paso2espera', { amount: monto }), hecho: liberado, activo: enEntrega },
    { label: liberado ? t('entrega.paso3ok', { time: hora }) : t('entrega.paso3'), hecho: liberado, activo: enEntrega },
  ]

  const titulo = liberado ? t('liberado.titulo') : disputa ? t('entrega.disputaTitulo') : t('entrega.titulo')
  const texto = liberado ? t('liberado.texto') : disputa ? t('entrega.disputaTexto') : t('entrega.texto')
  const chip = liberado ? t('liberado.chip') : disputa ? t('orden.DISPUTED') : t('entrega.chip')

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
        <Tilcayo pose={disputa ? 'asomado' : 'feliz'} className="codigo__gato brinca" />
        <Chip tone={disputa ? 'terracota' : 'verde'}>{chip}</Chip>
        <h1 className="display-m">{titulo}</h1>
        <p className="body-s muted">{texto}</p>
      </div>

      <div className="ticket glass">
        <span className="ticket__codigo">
          <span className="display-m">{monto}</span>
        </span>
        <PasosEntrega pasos={pasos} />
        <hr className="ticket__corte" />
        <div className="stack-10">
          <Row label={t('codigo.monto')} value={monto} />
          <Row label={t('codigo.cajero')} value={order.agent.name} />
          <Row label={t('entrega.estado')} value={t(`orden.${order.status}`)} />
          {tx && (
            <div className="row">
              <span className="row__label">{t('codigo.tx')}</span>
              <a className="link fila-icono" href={tx.url} target="_blank" rel="noreferrer">
                {tx.tx_hash.slice(0, 4)}…{tx.tx_hash.slice(-4)} · stellar.expert <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          )}
        </div>
      </div>

      {error && <p className="nota nota--error" role="alert">{error}</p>}

      <div className="stack-10">
        {liberado ? (
          <Button onClick={() => nav.go('historial', { root: true })}>{t('liberado.recibo')}</Button>
        ) : enEntrega ? (
          <>
            <Button disabled={Boolean(fase)} onClick={() => firmar('release')} className={fase ? 'is-cargando' : ''} icon={!fase}>
              {fase ? t(`pagar.fase.${fase}`) : t('entrega.firmar')}
            </Button>
            <Button variant="secondary" icon={false} disabled={Boolean(fase)} onClick={() => firmar('open_dispute', { reason: 'Falta dinero en la entrega' })}>
              {t('entrega.falta')}
            </Button>
          </>
        ) : (
          <Button variant="secondary" icon={false} onClick={() => nav.go('inicio', { root: true })}>
            {t('pantalla.inicio')}
          </Button>
        )}
      </div>
    </div>
  )
}
