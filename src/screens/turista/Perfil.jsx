import { ChevronRight, CircleHelp, Copy, FileText, Globe, Lock, LogOut, ShieldCheck } from 'lucide-react'
import Tilcayo from '../../components/Tilcayo'
import { Chip } from '../../components/ui'
import { TURISTA } from '../../data/config'
import { useI18n } from '../../i18n'

export default function Perfil({ nav, toast }) {
  const { t, L, lang, setLang } = useI18n()
  const ajustes = [
    { Icon: Globe, label: t('perfil.idioma'), valor: t('perfil.idiomaValor'), onClick: () => setLang(lang === 'es' ? 'en' : 'es') },
    { Icon: ShieldCheck, label: t('perfil.limite'), valor: 'Bs 3,500' },
    { Icon: Lock, label: t('perfil.seguridad'), valor: t('perfil.seguridadValor') },
    { Icon: CircleHelp, label: t('perfil.ayuda') },
    { Icon: FileText, label: t('perfil.terminos') },
  ]

  return (
    <div className="pantalla">
      <div className="perfil__cabeza">
        <h1 className="display-m">{t('perfil.titulo')}</h1>
        <Tilcayo pose="asomado" className="perfil__gato brinca" />
      </div>
      <div className="glass card perfil__tarjeta">
        <span className="avatar">{TURISTA.iniciales}</span>
        <span className="stack-4">
          <strong className="h-s">{TURISTA.nombre}</strong>
          <span className="body-s muted">
            {L(TURISTA.pais)} · {TURISTA.correo}
          </span>
          <Chip>{t('perfil.verificado')}</Chip>
        </span>
      </div>

      <div className="glass card stack-8 flota flota--suave">
        <span className="overline">{t('perfil.wallet')}</span>
        <div className="entre">
          <strong className="h-xs">{TURISTA.wallet}</strong>
          <button type="button" className="icon-plain" aria-label="Copiar" onClick={() => toast(t('comun.copiado'))}>
            <Copy size={18} />
          </button>
        </div>
        <div className="fila-icono">
          <Chip>{t('perfil.conectada')}</Chip>
          <span className="body-s muted">{t('perfil.red')}</span>
        </div>
      </div>

      <div className="glass card card--lista">
        {ajustes.map(({ Icon, label, valor, onClick }, i) => (
          <button key={label} type="button" className="ajuste entra" style={{ '--i': i }} onClick={onClick ?? (() => toast(t('comun.pronto')))}>
            <span className="icono-cuadrado">
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="label-m ajuste__label">{label}</span>
            {valor && <span className="body-s muted">{valor}</span>}
            <ChevronRight size={16} className="muted" aria-hidden="true" />
          </button>
        ))}
      </div>

      <button type="button" className="salir" onClick={() => nav.go('bienvenida', { root: true })}>
        <LogOut size={18} aria-hidden="true" /> {t('perfil.salir')}
      </button>
    </div>
  )
}
