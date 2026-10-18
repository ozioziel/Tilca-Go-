import { useState } from 'react'
import { Banknote, Bell, ChevronRight, MapPin, RefreshCw, TrendingUp } from 'lucide-react'
import Fila from '../../components/Fila'
import { Onda } from '../../components/Paisaje'
import { Button, Chip, Field, IconButton, Lines, Logo } from '../../components/ui'
import { errorText, useBackend, usePolling } from '../../lib/backend'
import { esHoy, ESTADO_FILA } from '../../lib/ordenes'
import { useI18n } from '../../i18n'

const RESERVAN = new Set(['AWAITING_PAYMENT', 'PAID_IN_ESCROW', 'IN_HANDOVER', 'DISPUTED'])

/** Abre la pantalla que corresponde al estado de una orden del cajero. */
export function abrirOrdenCajero(nav, setState, o) {
  setState((s) => ({ ...s, order: o }))
  if (o.status === 'PAID_IN_ESCROW') nav.go(o.withdrawal?.status === 'REDEEMED' ? 'validar' : 'escanear')
  else if (['IN_HANDOVER', 'SETTLED', 'DISPUTED'].includes(o.status)) nav.go('entregaCajero')
}

export default function InicioCajero({ nav, state, setState, toast }) {
  const { t, bs, num } = useI18n()
  const { api } = useBackend()
  const [ordenes, setOrdenes] = useState([])
  const [editando, setEditando] = useState(false)
  const [efectivo, setEfectivo] = useState('')
  const [error, setError] = useState('')
  const a = state.agent
  const abierto = a?.review_status === 'ACTIVE'

  usePolling(async () => {
    const r = await api('GET', '/orders')
    setOrdenes(r.orders.filter((o) => o.agent.id === a?.id))
  }, 5000, Boolean(a))

  const hoy = ordenes.filter((o) => o.status === 'SETTLED' && esHoy(o.created_at))
  const gananciaHoy = hoy.reduce((s, o) => s + Number(o.agent_fee_usdc), 0)
  const reservadas = ordenes.filter((o) => RESERVAN.has(o.status))

  const cambiar = async (body) => {
    setError('')
    try {
      const { agent } = await api('PATCH', '/agents/me/availability', body)
      setState((s) => ({ ...s, agent }))
      return true
    } catch (err) {
      setError(errorText(err))
      return false
    }
  }

  const guardarEfectivo = async () => {
    if (await cambiar({ cash_declared_bob: efectivo })) {
      setEditando(false)
      toast(t('cajero.efectivoGuardado'))
    }
  }

  if (!a) {
    return (
      <div className="pantalla inicio">
        <Logo />
        <p className="body-m muted centrado">{t('cajero.cargando')}</p>
      </div>
    )
  }

  return (
    <div className="pantalla inicio">
      <header className="inicio__top">
        <Logo />
        <div className="inicio__acciones">
          <Chip tone="oscuro">{t('cajero.modo')}</Chip>
          <IconButton icon={Bell} label="Notificaciones" />
        </div>
      </header>

      <div>
        <h1 className="display-m">{a.name}</h1>
        <p className="body-s muted fila-icono">
          <MapPin size={14} aria-hidden="true" /> {a.address}
        </p>
      </div>

      <div className="saldo saldo--cajero">
        <Onda className="saldo__onda deriva" />
        <div className="saldo__pila flota">
          <span className="saldo__fondo" />
          <button type="button" className="saldo__verde" onClick={() => nav.go('ordenes', { root: true })}>
            <span>
              <Lines text={t('cajero.verOrdenes')} />
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
          <div className="saldo__principal">
            <span className="saldo__deco saldo__deco--1" />
            <span className="saldo__deco saldo__deco--2" />
            <div className="saldo__arriba">
              <span className="label-s">{t('cajero.efectivoCaja')}</span>
              <span className="saldo__chip">{abierto ? t('cajero.abierto') : t('cajero.cerrado')}</span>
            </div>
            <span className="body-s saldo__suave">{t('cajero.disponibleRetiros')}</span>
            <strong className="saldo__monto">
              {num(a.cash_available_bob)} <small>Bs</small>
            </strong>
            <span className="body-s saldo__suave">{t('cajero.reservado', { amount: bs(Number(a.cash_reserved_bob)), n: reservadas.length })}</span>
            <button
              type="button"
              className="saldo__ocultar"
              onClick={() => {
                setEfectivo(a.cash_declared_bob)
                setEditando((v) => !v)
              }}
            >
              <RefreshCw size={16} /> {t('cajero.actualizar')}
            </button>
          </div>
        </div>
      </div>

      {editando && (
        <div className="glass card stack-10 entra">
          <Field label={t('cajero.efectivoDeclarado')} value={efectivo} onChange={(v) => setEfectivo(v.replace(/[^\d.]/g, ''))} inputMode="decimal" />
          <Button onClick={guardarEfectivo}>{t('cajero.guardar')}</Button>
        </div>
      )}

      {['ACTIVE', 'PAUSED'].includes(a.review_status) ? (
        <label className="interruptor glass">
          <span className="stack-2">
            <strong className="label-m">{t('cajero.disponibleRetiros')}</strong>
            <span className="body-s muted">{abierto ? t('cajero.visible') : t('cajero.oculto')}</span>
          </span>
          <input type="checkbox" checked={abierto} onChange={(e) => cambiar({ open: e.target.checked })} />
          <span className="interruptor__pista" aria-hidden="true">
            <span />
          </span>
        </label>
      ) : (
        <p className="nota nota--beige">{t('cajero.enRevision', { status: a.review_status })}</p>
      )}

      {error && <p className="nota nota--error" role="alert">{error}</p>}

      <Button onClick={() => nav.go('escanear')}>{t('cajero.escanear')}</Button>

      <div className="dos-columnas">
        <div className="dato glass flota flota--suave">
          <span className="icono-cuadrado tono-verde">
            <TrendingUp size={18} aria-hidden="true" />
          </span>
          <span>
            <span className="label-s muted">{t('cajero.ganHoy')}</span>
            <strong className="label-m">{num(gananciaHoy)} USDC</strong>
          </span>
        </div>
        <div className="dato glass flota flota--suave" style={{ '--retraso': '0.7s' }}>
          <span className="icono-cuadrado tono-terracota">
            <Banknote size={18} aria-hidden="true" />
          </span>
          <span>
            <span className="label-s muted">{t('cajero.retHoy')}</span>
            <strong className="label-m">{t('cajero.entregas', { n: hoy.length })}</strong>
          </span>
        </div>
      </div>

      <section className="stack-8">
        <div className="titulo-seccion">
          <h2 className="h-xs">{t('cajero.ordenes')}</h2>
          <button type="button" className="link" onClick={() => nav.go('ordenes', { root: true })}>
            {t('cajero.verTodas')}
          </button>
        </div>
        <div className="glass card card--lista">
          {reservadas.length === 0 && <p className="body-s muted centrado">{t('cajero.sinOrdenes')}</p>}
          {reservadas.map((o, i) => (
            <Fila
              key={o.id}
              i={i}
              estado={ESTADO_FILA[o.status]}
              titulo={o.tourist_email}
              detalle={`${num(o.amount_usdc)} USDC · ${t(`orden.${o.status}`)}`}
              monto={bs(Number(o.net_bob))}
              chip={t('estado.reservada')}
              onClick={() => abrirOrdenCajero(nav, setState, o)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
