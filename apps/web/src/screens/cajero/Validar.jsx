import { useState } from 'react'
import { Check, ExternalLink } from 'lucide-react'
import { Button, Chip, Header, Row } from '../../components/ui'
import { useTimers } from '../../components/hooks'
import { cotizar, liquidacionCajero, ORDER_CODE, STELLAR_EXPLORER, STELLAR_TX, TURISTA } from '../../data/config'
import { useI18n } from '../../i18n'

export default function Validar({ nav, toast }) {
  const { t, bs, num } = useI18n()
  const later = useTimers()
  const [revisado, setRevisado] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const q = cotizar(100)
  const l = liquidacionCajero(100)

  // Firma `start_handover`: desde aquí el turista ya no puede pedir un reembolso unilateral
  const iniciar = () => {
    setIniciando(true)
    later(() => nav.go('entregaCajero'), 1100)
  }

  return (
    <div className="pantalla">
      <Header title={t('validar.titulo')} onBack={nav.back} />
      <Chip>{t('validar.unico')}</Chip>

      <div className="glass card stack-4 flota flota--suave">
        <span className="overline">{t('validar.entrega')}</span>
        <strong className="display-l text-terra">{bs(q.efectivo)}</strong>
        <span className="body-s muted">{t('validar.orden', { code: ORDER_CODE })}</span>
      </div>

      <div className="glass card perfil__tarjeta entra" style={{ '--i': 1 }}>
        <span className="avatar avatar--chico">{TURISTA.iniciales}</span>
        <span className="stack-4">
          <strong className="label-m">{TURISTA.nombre}</strong>
          <span className="body-s muted">{t('validar.pasaporte')}</span>
          <Chip>{t('perfil.verificado')}</Chip>
        </span>
      </div>

      <div className="glass card stack-10 entra" style={{ '--i': 2 }}>
        <Row label={t('validar.pago')} value={`${num(l.pago)} USDC`} />
        <Row label={t('validar.comision')} value={`−${num(l.comisionTilcago)} USDC`} />
        <Row label={t('validar.recibes')} value={`${num(l.recibe)} USDC`} strong tone="teal" />
        <div className="row">
          <span className="row__label">{t('validar.tx')}</span>
          <a className="link fila-icono" href={`${STELLAR_EXPLORER}/tx/${STELLAR_TX}`} target="_blank" rel="noreferrer">
            {STELLAR_TX.slice(0, 4)}…{STELLAR_TX.slice(-4)} <ExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
        <p className="label-s muted">{t('validar.nota', { fee: num(l.comisionAgente) })}</p>
      </div>

      <label className="casilla">
        <input type="checkbox" checked={revisado} onChange={(e) => setRevisado(e.target.checked)} />
        <span className="casilla__caja" aria-hidden="true">
          <Check size={14} />
        </span>
        <span className="body-s">{t('validar.check')}</span>
      </label>

      <div className="stack-10">
        <Button disabled={!revisado || iniciando} onClick={iniciar} className={iniciando ? 'is-cargando' : ''} icon={!iniciando}>
          {iniciando ? t('validar.iniciando') : t('validar.confirmar')}
        </Button>
        <Button variant="secondary" icon={false} onClick={() => toast(t('comun.pronto'))}>
          {t('validar.reportar')}
        </Button>
      </div>
    </div>
  )
}
