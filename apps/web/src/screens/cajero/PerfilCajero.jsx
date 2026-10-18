import { ChevronRight, Clock, Globe, LogOut, MapPin, Wallet } from 'lucide-react'
import Tilcayo from '../../components/Tilcayo'
import { Chip } from '../../components/ui'
import { useBackend } from '../../lib/backend'
import { shortAddress } from '../../lib/wallet'
import { useWalletChecks } from '../comun/Wallet'
import { useI18n } from '../../i18n'

export default function PerfilCajero({ nav, state }) {
  const { t, lang, setLang, num } = useI18n()
  const { user, balance, logout } = useBackend()
  const a = state.agent
  const checks = useWalletChecks(a?.wallet_address)

  const salir = () => {
    logout()
    nav.go('acceso', { root: true })
  }

  return (
    <div className="pantalla">
      <div className="perfil__cabeza">
        <h1 className="display-m">{t('perfil.titulo')}</h1>
        <Tilcayo pose="asomado" className="perfil__gato brinca" />
      </div>

      <div className="glass card perfil__tarjeta">
        <span className="avatar">{a ? a.name.slice(0, 2).toUpperCase() : '··'}</span>
        <span className="stack-4">
          <strong className="h-s">{a?.name}</strong>
          <span className="body-s muted">{user?.email}</span>
          <Chip tone={a?.review_status === 'ACTIVE' ? 'verde' : 'beige'}>{a?.review_status}</Chip>
        </span>
      </div>

      <div className="glass card stack-8">
        <span className="overline">{t('perfilC.wallet')}</span>
        <strong className="h-xs">{shortAddress(a?.wallet_address)}</strong>
        <div className="fila-icono">
          <Chip tone={checks.lista ? 'verde' : 'terracota'}>{checks.lista ? t('perfil.conectada') : t('perfilC.revisar')}</Chip>
          <span className="body-s muted">{balance?.usdc != null && checks.cuentaOk ? `${num(balance.usdc)} ${checks.asset}` : ''}</span>
        </div>
      </div>

      <div className="glass card card--lista">
        <button type="button" className="ajuste" onClick={() => nav.go('wallet')}>
          <span className="icono-cuadrado">
            <Wallet size={18} aria-hidden="true" />
          </span>
          <span className="label-m ajuste__label">{t('perfil.walletAjuste')}</span>
          <ChevronRight size={16} className="muted" aria-hidden="true" />
        </button>
        <div className="ajuste">
          <span className="icono-cuadrado">
            <MapPin size={18} aria-hidden="true" />
          </span>
          <span className="label-m ajuste__label">{a?.address}</span>
        </div>
        <div className="ajuste">
          <span className="icono-cuadrado">
            <Clock size={18} aria-hidden="true" />
          </span>
          <span className="label-m ajuste__label">{a?.hours ?? '—'}</span>
        </div>
        <button type="button" className="ajuste" onClick={() => setLang(lang === 'es' ? 'en' : 'es')}>
          <span className="icono-cuadrado">
            <Globe size={18} aria-hidden="true" />
          </span>
          <span className="label-m ajuste__label">{t('perfil.idioma')}</span>
          <span className="body-s muted">{t('perfil.idiomaValor')}</span>
        </button>
      </div>

      <button type="button" className="salir" onClick={salir}>
        <LogOut size={18} aria-hidden="true" /> {t('perfil.salir')}
      </button>
    </div>
  )
}
