import { useCallback, useEffect, useState } from 'react'
import { House, ListOrdered, ScanLine, TrendingUp, User } from 'lucide-react'
import PhoneApp from '../../components/PhoneApp'
import { BackendProvider, useBackend } from '../../lib/backend'
import Acceso from '../comun/Acceso'
import Wallet from '../comun/Wallet'
import InicioCajero from './InicioCajero'
import Escanear from './Escanear'
import Validar from './Validar'
import EntregaCajero from './EntregaCajero'
import Ganancias from './Ganancias'
import OrdenesCajero from './OrdenesCajero'
import PerfilCajero from './PerfilCajero'
import { useI18n } from '../../i18n'

function AccesoCajero({ nav, setState }) {
  const { t } = useI18n()
  const { api, logout } = useBackend()
  const listo = async () => {
    try {
      const { agent } = await api('GET', '/agents/me')
      setState((s) => ({ ...s, agent }))
      nav.go('inicio', { root: true })
    } catch {
      logout()
      nav.go('sinPunto', { replace: true })
    }
  }
  return <Acceso nav={nav} onDone={listo} emailInicial={import.meta.env.DEV ? 'rosa@tilcago.test' : ''} nota={t('cajero.accesoNota')} />
}

function SinPunto({ nav }) {
  const { t } = useI18n()
  return (
    <div className="pantalla">
      <p className="nota nota--error">{t('cajero.sinPunto')}</p>
      <button type="button" className="link" onClick={() => nav.go('acceso', { replace: true })}>
        {t('acceso.cambiar')}
      </button>
    </div>
  )
}

/** La wallet del cajero debe ser la registrada en su postulación. */
function WalletCajero(props) {
  return <Wallet {...props} esperada={props.state.agent?.wallet_address} />
}

const SCREENS = {
  acceso: AccesoCajero,
  sinPunto: SinPunto,
  wallet: WalletCajero,
  inicio: InicioCajero,
  escanear: Escanear,
  validar: Validar,
  entregaCajero: EntregaCajero,
  ordenes: OrdenesCajero,
  ganancias: Ganancias,
  perfil: PerfilCajero,
}

const TABS = {
  items: [
    { id: 'inicio', label: 'tab.inicio', Icon: House },
    { id: 'escanear', label: 'tab.escanear', Icon: ScanLine },
    { id: 'ordenes', label: 'tab.ordenes', Icon: ListOrdered },
    { id: 'ganancias', label: 'tab.ganancias', Icon: TrendingUp },
    { id: 'perfil', label: 'tab.perfil', Icon: User },
  ],
  map: { inicio: 'inicio', escanear: 'escanear', ordenes: 'ordenes', ganancias: 'ganancias', perfil: 'perfil' },
  target: { inicio: 'inicio', escanear: 'escanear', ordenes: 'ordenes', ganancias: 'ganancias', perfil: 'perfil' },
}

function CajeroPhone() {
  const { user, api } = useBackend()
  const [state, setState] = useState({ agent: null, order: null, despuesDeWallet: null })

  // Perfil del punto (efectivo declarado/reservado, wallet). Se recarga desde las pantallas con refrescarAgente.
  const refrescarAgente = useCallback(async () => {
    const { agent } = await api('GET', '/agents/me')
    setState((s) => ({ ...s, agent }))
    return agent
  }, [api])

  useEffect(() => {
    if (user) refrescarAgente().catch(() => {})
  }, [user, refrescarAgente])

  return (
    <PhoneApp
      screens={SCREENS}
      initial={user ? 'inicio' : 'acceso'}
      tabs={TABS}
      state={{ ...state, refrescarAgente }}
      setState={setState}
    />
  )
}

export default function CajeroApp() {
  return (
    <BackendProvider app="cajero">
      <CajeroPhone />
    </BackendProvider>
  )
}
