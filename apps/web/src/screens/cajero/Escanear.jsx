import { useEffect, useState } from 'react'
import { Listo, QRCode } from '../../components/QR'
import { Button, Field, Header } from '../../components/ui'
import { useTimers } from '../../components/hooks'
import { ORDER_CODE } from '../../data/config'
import { useI18n } from '../../i18n'

// El láser recorre el QR del turista, aparece «¡Listo!» y pasa solo a Validar.
export default function Escanear({ nav }) {
  const { t } = useI18n()
  const later = useTimers()
  const [codigo, setCodigo] = useState(ORDER_CODE)

  useEffect(() => {
    later(() => nav.go('validar'), 3400)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="pantalla">
      <Header title={t('escanear.titulo')} onBack={nav.back} />

      <div className="visor">
        <div className="visor__celular flota flota--rapida">
          <QRCode seed={23} />
        </div>
        <svg className="visor__esquinas" viewBox="0 0 250 250" aria-hidden="true">
          <path d="M4 50V20A16 16 0 0 1 20 4H50 M200 4H230A16 16 0 0 1 246 20V50 M246 200V230A16 16 0 0 1 230 246H200 M50 246H20A16 16 0 0 1 4 230V200" />
        </svg>
        <span className="laser laser--visor" aria-hidden="true" />
        <Listo dark title={t('codigo.listo')} sub={t('escanear.valido', { code: ORDER_CODE })} className="listo--visor" />
      </div>

      <p className="body-s muted centrado">{t('escanear.apunta')}</p>
      <div className="separador">
        <span />
        <span className="label-s muted">{t('escanear.o')}</span>
        <span />
      </div>
      <Field label={t('escanear.campo')} value={codigo} onChange={(v) => setCodigo(v.toUpperCase())} />
      <Button disabled={codigo.trim().length < 6} onClick={() => nav.go('validar')}>
        {t('escanear.validar')}
      </Button>
    </div>
  )
}
