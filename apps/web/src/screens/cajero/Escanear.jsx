import { useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { Listo, QRCode } from '../../components/QR'
import { Button, Field, Header } from '../../components/ui'
import { useTimers } from '../../components/hooks'
import { errorText, useBackend } from '../../lib/backend'
import { useI18n } from '../../i18n'

const soportaCamara = () => typeof window !== 'undefined' && 'BarcodeDetector' in window && Boolean(navigator.mediaDevices?.getUserMedia)

/**
 * El cajero escanea el QR del turista (cámara con BarcodeDetector, si el navegador
 * lo soporta) o escribe el código. El API lo valida y lo consume una sola vez.
 */
export default function Escanear({ nav, setState }) {
  const { t } = useI18n()
  const { api } = useBackend()
  const later = useTimers()
  const [codigo, setCodigo] = useState('')
  const [camara, setCamara] = useState(false)
  const [valido, setValido] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const video = useRef(null)
  const stream = useRef(null)

  const validar = async (valor) => {
    const code = (valor ?? codigo).trim().replace(/^tilcago:/i, '').toUpperCase()
    if (code.length < 6 || cargando) return
    setCargando(true)
    setError('')
    try {
      const { order } = await api('POST', '/withdrawals/verify', { code })
      setValido(code)
      setState((s) => ({ ...s, order }))
      later(() => nav.go('validar'), 900)
    } catch (err) {
      setError(errorText(err))
      setCargando(false)
    }
  }

  const detener = () => {
    stream.current?.getTracks().forEach((tr) => tr.stop())
    stream.current = null
    setCamara(false)
  }

  useEffect(() => detener, [])

  const encender = async () => {
    setError('')
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      setCamara(true)
    } catch {
      setError(t('escanear.sinCamara'))
    }
  }

  // Lee el video cuadro a cuadro hasta encontrar un QR de TilcaGo
  useEffect(() => {
    if (!camara || !video.current) return
    video.current.srcObject = stream.current
    video.current.play().catch(() => {})
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    let alive = true
    const tick = async () => {
      if (!alive || !video.current) return
      try {
        const [hit] = await detector.detect(video.current)
        if (hit?.rawValue?.toLowerCase().startsWith('tilcago:')) {
          detener()
          setCodigo(hit.rawValue.slice(8))
          validar(hit.rawValue)
          return
        }
      } catch {
        /* cuadro sin imagen todavía */
      }
      setTimeout(tick, 300)
    }
    tick()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camara])

  return (
    <div className="pantalla">
      <Header title={t('escanear.titulo')} onBack={nav.back} />

      <div className="visor">
        {camara ? (
          <video ref={video} className="visor__video" muted playsInline />
        ) : (
          <div className="visor__celular flota flota--rapida">
            <QRCode seed={23} />
          </div>
        )}
        <svg className="visor__esquinas" viewBox="0 0 250 250" aria-hidden="true">
          <path d="M4 50V20A16 16 0 0 1 20 4H50 M200 4H230A16 16 0 0 1 246 20V50 M246 200V230A16 16 0 0 1 230 246H200 M50 246H20A16 16 0 0 1 4 230V200" />
        </svg>
        {camara && <span className="laser laser--visor" aria-hidden="true" />}
        {valido && <Listo dark title={t('codigo.listo')} sub={t('escanear.valido', { code: valido })} />}
      </div>

      {soportaCamara() && !camara && (
        <Button variant="secondary" icon={false} onClick={encender}>
          <Camera size={18} aria-hidden="true" /> {t('escanear.camara')}
        </Button>
      )}
      <p className="body-s muted centrado">{t('escanear.apunta')}</p>
      <div className="separador">
        <span />
        <span className="label-s muted">{t('escanear.o')}</span>
        <span />
      </div>
      <Field label={t('escanear.campo')} value={codigo} onChange={(v) => setCodigo(v.toUpperCase())} placeholder="TG-XXX-XXX" />
      {error && <p className="nota nota--error" role="alert">{error}</p>}
      <Button disabled={codigo.trim().length < 6 || cargando} onClick={() => validar()} className={cargando ? 'is-cargando' : ''} icon={!cargando}>
        {t('escanear.validar')}
      </Button>
    </div>
  )
}
