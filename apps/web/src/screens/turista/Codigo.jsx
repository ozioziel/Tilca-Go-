import { useEffect } from 'react'
import { Copy, ExternalLink, X } from 'lucide-react'
import Tilcayo from '../../components/Tilcayo'
import { Listo, QRCode } from '../../components/QR'
import { Button, Chip, Header, Row } from '../../components/ui'
import { useTimers } from '../../components/hooks'
import { CAJEROS, cotizar, ORDER_CODE, STELLAR_EXPLORER, STELLAR_TX } from '../../data/config'
import { useI18n } from '../../i18n'

export default function Codigo({ nav, state, toast }) {
  const { t, bs } = useI18n()
  const q = cotizar(state.usd)
  const cajero = CAJEROS.find((c) => c.id === state.cajeroId) ?? CAJEROS[0]
  const later = useTimers()

  // Simulación: después de que el cajero escanea el código, empieza la entrega en el mostrador
  useEffect(() => {
    later(() => {
      toast(t('codigo.escaneadoAviso'))
      nav.go('entrega')
    }, 4600)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(ORDER_CODE)
    } catch {
      /* algunos navegadores bloquean el portapapeles; igual avisamos */
    }
    toast(t('comun.copiado'))
  }

  const compartir = async () => {
    const texto = `TilcaGo · ${ORDER_CODE} · ${bs(q.efectivo)} · ${cajero.nombre}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'TilcaGo', text: texto })
        return
      } catch {
        /* la persona canceló */
      }
    }
    copiar()
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
          <QRCode seed={11} />
          <span className="ticket__sello">TG</span>
          <span className="laser" aria-hidden="true" />
          <Listo title={t('codigo.listo')} sub={t('codigo.escaneado')} className="listo--tarde" />
        </div>
        <button type="button" className="ticket__codigo" onClick={copiar} aria-label={t('comun.copiado')}>
          <span className="display-m">{ORDER_CODE}</span>
          <Copy size={18} aria-hidden="true" />
        </button>
        <hr className="ticket__corte" />
        <div className="stack-10">
          <Row label={t('codigo.monto')} value={bs(q.efectivo)} />
          <Row label={t('codigo.cajero')} value={cajero.nombre} />
          <Row label={t('codigo.valido')} value={t('codigo.hoy')} />
          <div className="row">
            <span className="row__label">{t('codigo.tx')}</span>
            <a className="link fila-icono" href={`${STELLAR_EXPLORER}/tx/${STELLAR_TX}`} target="_blank" rel="noreferrer">
              {STELLAR_TX.slice(0, 4)}…{STELLAR_TX.slice(-4)} · stellar.expert <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      <div className="stack-10">
        <Button onClick={() => nav.go('cajeros')}>{t('codigo.llegar')}</Button>
        <Button variant="secondary" icon={false} onClick={compartir}>
          {t('codigo.compartir')}
        </Button>
      </div>
    </div>
  )
}
