import { useEffect, useRef, useState } from 'react'
import { ArrowUpDown, Bell, ChevronRight, Clock, Eye, EyeOff, MapPin, QrCode } from 'lucide-react'
import Trepada from '../../components/Trepada'
import { useReducedMotion } from '../../components/hooks'
import Fila from '../../components/Fila'
import { Onda } from '../../components/Paisaje'
import { Button, Chip, IconButton, LangToggle, Lines, Logo } from '../../components/ui'
import { useBackend } from '../../lib/backend'
import { ACTIVAS, ESTADO_FILA, fecha } from '../../lib/ordenes'
import { cotizarCon } from '../../lib/quote'
import { useI18n } from '../../i18n'

export default function Inicio({ nav, state, setState, toast }) {
  const { t, num, lang } = useI18n()
  const { user, wallet, balance, rate, api } = useBackend()
  const [ordenes, setOrdenes] = useState([])
  const aplicada = cotizarCon(rate, 1).aplicada
  const nombre = user ? user.email.split('@')[0].replace(/^./, (c) => c.toUpperCase()) : ''
  const activa = ordenes.find((o) => ACTIVAS.has(o.status))

  useEffect(() => {
    if (!user) return
    api('GET', '/orders')
      .then((r) => setOrdenes(r.orders))
      .catch(() => {})
  }, [user, api])

  const abrirOrden = (o) => {
    setState((s) => ({ ...s, order: o }))
    nav.go(o.status === 'IN_HANDOVER' ? 'entrega' : 'codigo')
  }
  const rootRef = useRef(null)
  const refs = { logo: useRef(null), card: useRef(null), cta: useRef(null), tiles: useRef(null) }
  const reduce = useReducedMotion()
  const [intro, setIntro] = useState(Boolean(state.introPending) && !reduce)
  const oculto = state.saldoOculto

  const terminarIntro = () => {
    setIntro(false)
    setState((s) => ({ ...s, introPending: false }))
  }

  const accesos = [
    { id: 'cotizar', label: t('inicio.cotizar'), Icon: ArrowUpDown, tono: 'terracota' },
    { id: 'cajeros', label: t('inicio.cajeros'), Icon: MapPin, tono: 'verde' },
    { id: 'codigo', label: t('inicio.micodigo'), Icon: QrCode, tono: 'beige' },
    { id: 'historial', label: t('inicio.historial'), Icon: Clock, tono: 'tinta' },
  ]

  return (
    <div className="pantalla inicio" ref={rootRef}>
      <header className="inicio__top">
        <Logo ref={refs.logo} hideCat={intro} className={intro ? '' : 'logo--llega'} />
        <div className="inicio__acciones">
          <LangToggle />
          <IconButton icon={Bell} label="Notificaciones" />
        </div>
      </header>

      <div>
        <h1 className="display-m">{nombre ? t('inicio.hola', { name: nombre }) : t('inicio.holaAnon')}</h1>
        <p className="body-s muted fila-icono">
          <MapPin size={14} aria-hidden="true" /> La Paz, Bolivia
        </p>
      </div>

      <div className="saldo" ref={refs.card}>
        <Onda className="saldo__onda deriva" />
        <div className="saldo__pila flota">
          <span className="saldo__fondo" />
          <button type="button" className="saldo__verde" onClick={() => nav.go('historial')}>
            <span>
              <Lines text={t('inicio.verMov')} />
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
          <div className="saldo__principal">
            <span className="saldo__deco saldo__deco--1" />
            <span className="saldo__deco saldo__deco--2" />
            <div className="saldo__arriba">
              <span className="label-s">{t('inicio.billetera')}</span>
              <span className="saldo__chip">Stellar</span>
            </div>
            {wallet.address ? (
              <>
                <span className="body-s saldo__suave">{t('inicio.saldo')}</span>
                <strong className="saldo__monto">
                  {oculto ? '••••••' : num(balance?.usdc ?? 0)} <small>USDC</small>
                </strong>
                <span className="body-s saldo__suave">{oculto ? '≈ Bs ••••' : `≈ Bs ${num((balance?.usdc ?? 0) * aplicada)}`}</span>
                <button type="button" className="saldo__ocultar" onClick={() => setState((s) => ({ ...s, saldoOculto: !s.saldoOculto }))}>
                  {oculto ? <Eye size={16} /> : <EyeOff size={16} />}
                  {oculto ? t('inicio.mostrar') : t('inicio.ocultar')}
                </button>
              </>
            ) : (
              <>
                <span className="body-s saldo__suave">{t('inicio.sinWallet')}</span>
                <button type="button" className="saldo__conectar" onClick={() => nav.go('wallet')}>
                  {t('inicio.conectar')} <ChevronRight size={16} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <button type="button" className="tasa-pill glass flota flota--suave" onClick={() => nav.go('cotizar')}>
        <span className="tasa-pill__icono">
          <ArrowUpDown size={18} aria-hidden="true" />
        </span>
        <span className="tasa-pill__texto">
          <span className="label-s muted">{t('inicio.tasa')}</span>
          <strong className="label-m">1 USDC = {aplicada} Bs</strong>
        </span>
        <Chip>{t('inicio.envivo')}</Chip>
      </button>

      <div ref={refs.cta}>
        <Button onClick={() => nav.go('cotizar')}>{t('inicio.retirar')}</Button>
      </div>

      <div className="accesos" ref={refs.tiles}>
        {accesos.map(({ id, label, Icon, tono }, i) => (
          <button
            key={id}
            type="button"
            className="acceso glass"
            style={{ '--i': i }}
            onClick={() => (id === 'codigo' ? (activa ? abrirOrden(activa) : toast(t('inicio.sinCodigo'))) : nav.go(id))}
          >
            <span className={`acceso__icono tono-${tono}`}>
              <Icon size={22} aria-hidden="true" />
            </span>
            <span className="label-s">{label}</span>
          </button>
        ))}
      </div>

      <section className="stack-8">
        <div className="titulo-seccion">
          <h2 className="h-xs">{t('inicio.ultimos')}</h2>
          <button type="button" className="link" onClick={() => nav.go('historial')}>
            {t('inicio.verTodo')}
          </button>
        </div>
        <div className="glass card card--lista">
          {ordenes.length === 0 && <p className="body-s muted centrado">{user ? t('inicio.sinMov') : t('inicio.entraParaVer')}</p>}
          {ordenes.slice(0, 2).map((o, i) => (
            <Fila
              key={o.id}
              i={i}
              estado={ESTADO_FILA[o.status]}
              titulo={o.agent.name}
              detalle={`${fecha(o.created_at, lang)} · ${num(o.amount_usdc)} USDC`}
              monto={`Bs ${num(o.net_bob)}`}
              chip={t(`orden.${o.status}`)}
              onClick={ACTIVAS.has(o.status) ? () => abrirOrden(o) : undefined}
            />
          ))}
        </div>
      </section>

      {intro && <Trepada containerRef={rootRef} targets={refs} onDone={terminarIntro} />}
    </div>
  )
}
