import { ChevronRight, CircleHelp, Copy, FileText, Globe, LogOut, Wallet } from 'lucide-react'
import Tilcayo from '../../components/Tilcayo'
import { Chip } from '../../components/ui'
import { useBackend } from '../../lib/backend'
import { shortAddress } from '../../lib/wallet'
import { useWalletChecks } from '../comun/Wallet'
import { useI18n } from '../../i18n'

export default function Perfil({ nav, toast }) {
  const { t, lang, setLang, num } = useI18n()
  const { user, wallet, balance, logout } = useBackend()
  const checks = useWalletChecks()
  const ajustes = [
    { Icon: Globe, label: t('perfil.idioma'), valor: t('perfil.idiomaValor'), onClick: () => setLang(lang === 'es' ? 'en' : 'es') },
    { Icon: Wallet, label: t('perfil.walletAjuste'), onClick: () => nav.go('wallet') },
    { Icon: CircleHelp, label: t('perfil.ayuda') },
    { Icon: FileText, label: t('perfil.terminos') },
  ]

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(wallet.address ?? '')
    } catch {
      /* portapapeles bloqueado */
    }
    toast(t('comun.copiado'))
  }

  const salir = () => {
    logout()
    nav.go('bienvenida', { root: true })
  }

  return (
    <div className="pantalla">
      <div className="perfil__cabeza">
        <h1 className="display-m">{t('perfil.titulo')}</h1>
        <Tilcayo pose="asomado" className="perfil__gato brinca" />
      </div>
      <div className="glass card perfil__tarjeta">
        <span className="avatar">{user ? user.email.slice(0, 2).toUpperCase() : '··'}</span>
        <span className="stack-4">
          <strong className="h-s">{user ? user.email.split('@')[0] : t('perfil.invitado')}</strong>
          <span className="body-s muted">{user?.email ?? t('inicio.entraParaVer')}</span>
          {user && <Chip>{t('perfil.correoVerificado')}</Chip>}
        </span>
      </div>

      <div className="glass card stack-8 flota flota--suave">
        <span className="overline">{t('perfil.wallet')}</span>
        {wallet.address ? (
          <>
            <div className="entre">
              <strong className="h-xs">{shortAddress(wallet.address)}</strong>
              <button type="button" className="icon-plain" aria-label="Copiar" onClick={copiar}>
                <Copy size={18} />
              </button>
            </div>
            <div className="fila-icono">
              <Chip tone={checks.lista ? 'verde' : 'terracota'}>{checks.lista ? t('perfil.conectada') : t('pagar.walletFalta')}</Chip>
              <span className="body-s muted">{balance?.usdc != null ? `${num(balance.usdc)} ${checks.asset}` : t('perfil.red')}</span>
            </div>
          </>
        ) : (
          <button type="button" className="link" onClick={() => nav.go('wallet')}>
            {t('inicio.conectar')}
          </button>
        )}
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

      {user && (
        <button type="button" className="salir" onClick={salir}>
          <LogOut size={18} aria-hidden="true" /> {t('perfil.salir')}
        </button>
      )}
    </div>
  )
}
