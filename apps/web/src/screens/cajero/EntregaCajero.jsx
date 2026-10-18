import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import Tilcayo from '../../components/Tilcayo'
import { Button, Chip, Header, Row } from '../../components/ui'
import { useTimers } from '../../components/hooks'
import { cotizar, liquidacionCajero, ORDER_CODE, STELLAR_EXPLORER, STELLAR_TX_RELEASE, TURISTA } from '../../data/config'
import { useI18n } from '../../i18n'

/**
 * Entrega en el mostrador (lado del cajero). La orden ya está en IN_HANDOVER:
 * el cajero cuenta el efectivo frente al turista y solo lo entrega cuando
 * ve la liberación (`release`) confirmada en Stellar.
 *
 * fase: esperando → confirmado → entregado
 */
export default function EntregaCajero({ nav, toast }) {
  const { t, bs, num } = useI18n()
  const later = useTimers()
  const [fase, setFase] = useState('esperando')
  const q = cotizar(100)
  const l = liquidacionCajero(100)
  const ok = fase !== 'esperando'

  // Simulación: el turista firma la liberación a los pocos segundos
  useEffect(() => {
    later(() => setFase('confirmado'), 4200)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const terminar = () => {
    setFase('entregado')
    later(() => nav.go('inicio', { root: true }), 1600)
  }

  return (
    <div className="pantalla">
      <Header title={ok ? t('entregaC.tituloOk') : t('entregaC.tituloEspera')} onBack={ok ? undefined : nav.back} />
      <Chip tone={ok ? 'verde' : 'terracota'}>{ok ? t('entregaC.chipOk') : t('entregaC.chipEspera')}</Chip>

      <div className={`glass card stack-4 ${ok ? 'entra' : 'flota flota--suave'}`}>
        <span className="overline">{ok ? t('entregaC.labelOk') : t('entregaC.labelEspera')}</span>
        <strong className="display-l text-terra">{bs(q.efectivo)}</strong>
        <span className="body-s muted">{ok ? t('entregaC.subOk', { usdc: num(l.recibe) }) : t('entregaC.subEspera')}</span>
      </div>

      <div className="glass card perfil__tarjeta entra" style={{ '--i': 1 }}>
        <span className="avatar avatar--chico">{TURISTA.iniciales}</span>
        <span className="stack-4">
          <strong className="label-m">{TURISTA.nombre}</strong>
          <span className="body-s muted">{ORDER_CODE}</span>
          <Chip>{t('perfil.verificado')}</Chip>
        </span>
      </div>

      <div className="glass card stack-10 entra" style={{ '--i': 2 }}>
        <Row label={t('validar.pago')} value={`${num(l.pago)} USDC`} />
        <Row label={t('validar.comision')} value={`−${num(l.comisionTilcago)} USDC`} />
        <Row label={t('validar.recibes')} value={`${num(l.recibe)} USDC`} strong tone="teal" />
        {ok && (
          <div className="row">
            <span className="row__label">{t('validar.tx')}</span>
            <a className="link fila-icono" href={`${STELLAR_EXPLORER}/tx/${STELLAR_TX_RELEASE}`} target="_blank" rel="noreferrer">
              {STELLAR_TX_RELEASE.slice(0, 4)}…{STELLAR_TX_RELEASE.slice(-4)} <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        )}
      </div>

      <div className="stack-10">
        {ok ? (
          <>
            <Button disabled={fase === 'entregado'} onClick={terminar}>
              {t('entregaC.hecha')}
            </Button>
            <Button variant="secondary" icon={false} onClick={() => window.open(`${STELLAR_EXPLORER}/tx/${STELLAR_TX_RELEASE}`, '_blank', 'noreferrer')}>
              {t('entregaC.comprobante')}
            </Button>
          </>
        ) : (
          <>
            <Button disabled className="is-cargando" icon={false}>
              {t('entregaC.esperando')}
            </Button>
            <Button variant="secondary" icon={false} onClick={() => { toast(t('entregaC.cancelar')); nav.back() }}>
              {t('entregaC.cancelar')}
            </Button>
          </>
        )}
      </div>

      {fase === 'entregado' && (
        <div className="exito" role="status">
          <div className="exito__caja glass">
            <Tilcayo pose="feliz" className="exito__gato brinca" />
            <strong className="display-m">{t('validar.entregado')}</strong>
            <span className="body-s muted">{t('entregaC.subOk', { usdc: num(l.recibe) })}</span>
          </div>
        </div>
      )}
    </div>
  )
}
