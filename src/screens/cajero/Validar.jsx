import { useState } from 'react'
import { Check, ExternalLink } from 'lucide-react'
import Tilcayo from '../../components/Tilcayo'
import { Button, Chip, Header, Row } from '../../components/ui'
import { useTimers } from '../../components/hooks'
import { cotizar, liquidacionCajero, ORDER_CODE, STELLAR_EXPLORER, STELLAR_TX, TURISTA } from '../../data/config'
import { useI18n } from '../../i18n'

export default function Validar({ nav, toast }) {
  const { t, bs, num } = useI18n()
  const later = useTimers()
  const [revisado, setRevisado] = useState(false)
  const [entregado, setEntregado] = useState(false)
  const q = cotizar(100)
  const l = liquidacionCajero(100)

  const confirmar = () => {
    setEntregado(true)
    later(() => nav.go('inicio', { root: true }), 1600)
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
        <p className="label-s muted">{t('validar.nota')}</p>
      </div>

      <label className="casilla">
        <input type="checkbox" checked={revisado} onChange={(e) => setRevisado(e.target.checked)} />
        <span className="casilla__caja" aria-hidden="true">
          <Check size={14} />
        </span>
        <span className="body-s">{t('validar.check')}</span>
      </label>

      <div className="stack-10">
        <Button disabled={!revisado || entregado} onClick={confirmar}>
          {t('validar.confirmar')}
        </Button>
        <Button variant="secondary" icon={false} onClick={() => toast(t('comun.pronto'))}>
          {t('validar.reportar')}
        </Button>
      </div>

      {entregado && (
        <div className="exito" role="status">
          <div className="exito__caja glass">
            <Tilcayo pose="feliz" className="exito__gato brinca" />
            <strong className="display-m">{t('validar.entregado')}</strong>
            <span className="body-s muted">{t('validar.entregadoTxt')}</span>
          </div>
        </div>
      )}
    </div>
  )
}
