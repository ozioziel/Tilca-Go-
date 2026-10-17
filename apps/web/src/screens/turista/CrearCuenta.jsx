import { useState } from 'react'
import { Camera, Check, CreditCard, ShieldCheck } from 'lucide-react'
import { Button, Field, Header } from '../../components/ui'
import { TURISTA } from '../../data/config'
import { useI18n } from '../../i18n'

export default function CrearCuenta({ nav, setState }) {
  const { t, L } = useI18n()
  const [datos, setDatos] = useState({ nombre: TURISTA.nombre, correo: TURISTA.correo, pais: L(TURISTA.pais), pasaporte: TURISTA.pasaporte })
  const [foto, setFoto] = useState(false)
  const [acepto, setAcepto] = useState(true)
  const set = (k) => (v) => setDatos((d) => ({ ...d, [k]: v }))

  const continuar = () => {
    setState((s) => ({ ...s, introPending: true }))
    nav.go('inicio', { root: true, plain: true })
  }

  return (
    <div className="pantalla">
      <Header title={t('pantalla.crear')} onBack={nav.back} />
      <div className="progreso">
        <span className="label-s muted">{t('crear.paso')}</span>
        <div className="progreso__barras">
          <span className="is-on" />
          <span />
        </div>
      </div>

      <div className="glass card stack-14 entra" style={{ '--i': 0 }}>
        <Field label={t('crear.nombre')} value={datos.nombre} onChange={set('nombre')} autoComplete="name" />
        <Field label={t('crear.correo')} value={datos.correo} onChange={set('correo')} type="email" autoComplete="email" />
        <Field label={t('crear.pais')} value={datos.pais} onChange={set('pais')} dropdown />
        <Field label={t('crear.pasaporte')} value={datos.pasaporte} onChange={set('pasaporte')} />
      </div>

      <button type="button" className={`subir-foto entra ${foto ? 'is-ok' : ''}`} style={{ '--i': 1 }} onClick={() => setFoto(true)}>
        <span className="subir-foto__icono">{foto ? <Check size={22} /> : <CreditCard size={22} />}</span>
        <span className="subir-foto__texto">
          <strong>{t('crear.foto')}</strong>
          <span>{foto ? t('crear.fotoOk') : t('crear.fotoTxt')}</span>
        </span>
        {!foto && <Camera size={20} className="text-terra late" />}
      </button>

      <div className="nota nota--verde entra" style={{ '--i': 2 }}>
        <ShieldCheck size={20} aria-hidden="true" />
        <span>{t('crear.nota')}</span>
      </div>

      <label className="casilla">
        <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
        <span className="casilla__caja" aria-hidden="true">
          <Check size={14} />
        </span>
        <span className="body-s">{t('crear.terminos')}</span>
      </label>

      <Button disabled={!acepto} onClick={continuar}>
        {t('crear.continuar')}
      </Button>
    </div>
  )
}
