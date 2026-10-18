import { useEffect, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import Tilcayo from '../../components/Tilcayo'
import PasosEntrega from '../../components/PasosEntrega'
import { Button, Chip, Header, Row } from '../../components/ui'
import { useTimers } from '../../components/hooks'
import { CAJEROS, cotizar, STELLAR_EXPLORER, STELLAR_TX, STELLAR_TX_RELEASE } from '../../data/config'
import { useI18n } from '../../i18n'

/**
 * Entrega en el mostrador (lado del turista). El orden es la regla central de la v3:
 * el cajero cuenta el efectivo a la vista → el turista firma `release` →
 * el cajero ve el pago confirmado on-chain → recién entonces entrega los billetes.
 *
 * fase: contando → verificar → firmando → liberado
 */
export default function Entrega({ nav, state, toast }) {
  const { t, bs } = useI18n()
  const later = useTimers()
  const [fase, setFase] = useState('contando')
  const q = cotizar(state.usd)
  const cajero = CAJEROS.find((c) => c.id === state.cajeroId) ?? CAJEROS[0]
  const monto = bs(q.efectivo)
  const liberado = fase === 'liberado'
  const tx = liberado ? STELLAR_TX_RELEASE : STELLAR_TX

  // Simulación: el cajero termina de contar a los pocos segundos
  useEffect(() => {
    later(() => setFase('verificar'), 2200)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const firmar = () => {
    setFase('firmando')
    later(() => setFase('liberado'), 1500)
  }

  const pasos = [
    { label: t('entrega.paso1'), hecho: true },
    { label: fase === 'contando' ? t('entrega.paso2espera', { amount: monto }) : t('entrega.paso2', { amount: monto }), hecho: fase !== 'contando', activo: fase === 'contando' },
    { label: liberado ? t('entrega.paso3ok', { time: '18:12' }) : t('entrega.paso3'), hecho: liberado, activo: fase === 'verificar' || fase === 'firmando' },
  ]

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
        <Chip>{liberado ? t('liberado.chip') : t('entrega.chip')}</Chip>
        <h1 className="display-m">{liberado ? t('liberado.titulo') : t('entrega.titulo')}</h1>
        <p className="body-s muted">{liberado ? t('liberado.texto') : t('entrega.texto')}</p>
      </div>

      <div className="ticket glass">
        <span className="ticket__codigo">
          <span className="display-m">{monto}</span>
        </span>
        <PasosEntrega pasos={pasos} />
        <hr className="ticket__corte" />
        <div className="stack-10">
          <Row label={t('codigo.monto')} value={monto} />
          <Row label={t('codigo.cajero')} value={cajero.nombre} />
          <Row label={liberado ? t('liberado.liberado') : t('entrega.estado')} value={liberado ? 'Hoy, 18:12' : t('entrega.enEntrega')} />
          <div className="row">
            <span className="row__label">{t('codigo.tx')}</span>
            <a className="link fila-icono" href={`${STELLAR_EXPLORER}/tx/${tx}`} target="_blank" rel="noreferrer">
              {tx.slice(0, 4)}…{tx.slice(-4)} · stellar.expert <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      <div className="stack-10">
        {liberado ? (
          <>
            <Button onClick={() => nav.go('historial', { root: true })}>{t('liberado.recibo')}</Button>
            <Button variant="secondary" icon={false} onClick={() => toast(t('comun.pronto'))}>
              {t('liberado.disputa')}
            </Button>
          </>
        ) : (
          <>
            <Button disabled={fase !== 'verificar'} onClick={firmar} className={fase === 'firmando' ? 'is-cargando' : ''} icon={fase !== 'firmando'}>
              {fase === 'firmando' ? t('entrega.firmando') : t('entrega.firmar')}
            </Button>
            <Button variant="secondary" icon={false} onClick={() => toast(t('entrega.reportado'))}>
              {t('entrega.falta')}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
