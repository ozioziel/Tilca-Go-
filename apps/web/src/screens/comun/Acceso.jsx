import { useState } from 'react'
import { Check, KeyRound, Mail, ShieldCheck } from 'lucide-react'
import { Button, Field, Header } from '../../components/ui'
import { errorText, useBackend } from '../../lib/backend'
import { useI18n } from '../../i18n'

/**
 * Inicio de sesión con correo + código de un solo uso (v3 §4 paso 4).
 * Se usa en la app del turista y en la del cajero. `onDone(session)` decide a dónde ir.
 */
export default function Acceso({ nav, onDone, emailInicial = '', nota }) {
  const { t } = useI18n()
  const { requestOtp, login } = useBackend()
  const [paso, setPaso] = useState('correo') // correo | codigo
  const [email, setEmail] = useState(emailInicial)
  const [codigo, setCodigo] = useState('')
  const [devCode, setDevCode] = useState('')
  const [acepto, setAcepto] = useState(true)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const enviar = async () => {
    setCargando(true)
    setError('')
    try {
      const res = await requestOtp(email.trim())
      setDevCode(res.devCode ?? '')
      setPaso('codigo')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setCargando(false)
    }
  }

  const entrar = async () => {
    setCargando(true)
    setError('')
    try {
      const s = await login(email.trim(), codigo.trim())
      onDone(s)
    } catch (err) {
      setError(errorText(err))
      setCargando(false)
    }
  }

  const correoValido = /^\S+@\S+\.\S+$/.test(email.trim())

  return (
    <div className="pantalla">
      <Header title={t('acceso.titulo')} onBack={nav.back} />
      <div className="progreso">
        <span className="label-s muted">{paso === 'correo' ? t('acceso.paso1') : t('acceso.paso2')}</span>
        <div className="progreso__barras">
          <span className="is-on" />
          <span className={paso === 'codigo' ? 'is-on' : ''} />
        </div>
      </div>

      <div className="glass card stack-14 entra" style={{ '--i': 0 }}>
        {paso === 'correo' ? (
          <Field label={t('crear.correo')} value={email} onChange={setEmail} type="email" autoComplete="email" inputMode="email" placeholder="tu@correo.com" />
        ) : (
          <>
            <p className="body-s muted fila-icono">
              <Mail size={16} aria-hidden="true" /> {t('acceso.enviado', { email })}
            </p>
            <Field label={t('acceso.codigo')} value={codigo} onChange={(v) => setCodigo(v.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" />
            {devCode && (
              <button type="button" className="nota nota--beige" onClick={() => setCodigo(devCode)}>
                <KeyRound size={18} aria-hidden="true" />
                <span>{t('acceso.demo', { code: devCode })}</span>
              </button>
            )}
            <button type="button" className="link" onClick={() => setPaso('correo')}>
              {t('acceso.cambiar')}
            </button>
          </>
        )}
      </div>

      <div className="nota nota--verde entra" style={{ '--i': 1 }}>
        <ShieldCheck size={20} aria-hidden="true" />
        <span>{nota ?? t('acceso.nota')}</span>
      </div>

      {paso === 'correo' && (
        <label className="casilla">
          <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
          <span className="casilla__caja" aria-hidden="true">
            <Check size={14} />
          </span>
          <span className="body-s">{t('crear.terminos')}</span>
        </label>
      )}

      {error && <p className="nota nota--error" role="alert">{error}</p>}

      {paso === 'correo' ? (
        <Button disabled={!correoValido || !acepto || cargando} onClick={enviar} className={cargando ? 'is-cargando' : ''} icon={!cargando}>
          {t('acceso.enviar')}
        </Button>
      ) : (
        <Button disabled={codigo.length !== 6 || cargando} onClick={entrar} className={cargando ? 'is-cargando' : ''} icon={!cargando}>
          {t('acceso.entrar')}
        </Button>
      )}
    </div>
  )
}
