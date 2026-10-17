import { Banknote, Bell, ChevronRight, MapPin, RefreshCw, TrendingUp } from 'lucide-react'
import Fila from '../../components/Fila'
import { Onda } from '../../components/Paisaje'
import { Button, Chip, IconButton, LangToggle, Lines, Logo } from '../../components/ui'
import { CAJERA, ORDENES } from '../../data/config'
import { useI18n } from '../../i18n'

export default function InicioCajero({ nav, state, setState, toast }) {
  const { t, bs, num } = useI18n()
  const abierto = state.disponible

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
        <h1 className="display-m">{t('inicio.hola', { name: CAJERA.nombre })}</h1>
        <p className="body-s muted fila-icono">
          <MapPin size={14} aria-hidden="true" /> {CAJERA.local} · {CAJERA.direccion}
        </p>
      </div>

      <div className="saldo saldo--cajero">
        <Onda className="saldo__onda deriva" />
        <div className="saldo__pila flota">
          <span className="saldo__fondo" />
          <button type="button" className="saldo__verde" onClick={() => toast(t('comun.pronto'))}>
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
              {num(CAJERA.efectivo)} <small>Bs</small>
            </strong>
            <span className="body-s saldo__suave">{t('cajero.reservado', { amount: bs(CAJERA.reservado), n: ORDENES.length })}</span>
            <button type="button" className="saldo__ocultar" onClick={() => toast(t('comun.pronto'))}>
              <RefreshCw size={16} /> {t('cajero.actualizar')}
            </button>
          </div>
        </div>
      </div>

      <label className="interruptor glass">
        <span className="stack-2">
          <strong className="label-m">{t('cajero.disponibleRetiros')}</strong>
          <span className="body-s muted">{abierto ? t('cajero.visible') : t('cajero.oculto')}</span>
        </span>
        <input type="checkbox" checked={abierto} onChange={(e) => setState((s) => ({ ...s, disponible: e.target.checked }))} />
        <span className="interruptor__pista" aria-hidden="true">
          <span />
        </span>
      </label>

      <Button onClick={() => nav.go('escanear')}>{t('cajero.escanear')}</Button>

      <div className="dos-columnas">
        <div className="dato glass flota flota--suave">
          <span className="icono-cuadrado tono-verde">
            <TrendingUp size={18} aria-hidden="true" />
          </span>
          <span>
            <span className="label-s muted">{t('cajero.ganHoy')}</span>
            <strong className="label-m">2.60 USDC</strong>
          </span>
        </div>
        <div className="dato glass flota flota--suave" style={{ '--retraso': '0.7s' }}>
          <span className="icono-cuadrado tono-terracota">
            <Banknote size={18} aria-hidden="true" />
          </span>
          <span>
            <span className="label-s muted">{t('cajero.retHoy')}</span>
            <strong className="label-m">{t('cajero.entregas', { n: 4 })}</strong>
          </span>
        </div>
      </div>

      <section className="stack-8">
        <div className="titulo-seccion">
          <h2 className="h-xs">{t('cajero.ordenes')}</h2>
          <button type="button" className="link" onClick={() => toast(t('comun.pronto'))}>
            {t('cajero.verTodas')}
          </button>
        </div>
        <div className="glass card card--lista">
          {ORDENES.map((o, i) => (
            <Fila
              key={o.id}
              i={i}
              estado="pendiente"
              titulo={`${o.turista} · ${o.codigo}`}
              detalle={t('cajero.vence', { time: o.vence, usd: o.usd })}
              monto={o.monto}
              chip={t('estado.reservada')}
              onClick={() => nav.go('validar')}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
