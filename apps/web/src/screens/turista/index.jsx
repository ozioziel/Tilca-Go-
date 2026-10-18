import { useState } from 'react'
import { Clock, House, MapPin, QrCode, User } from 'lucide-react'
import PhoneApp from '../../components/PhoneApp'
import { BackendProvider } from '../../lib/backend'
import Bienvenida from './Bienvenida'
import CrearCuenta from './CrearCuenta'
import Inicio from './Inicio'
import Cotizar from './Cotizar'
import Cajeros from './Cajeros'
import Pagar from './Pagar'
import Codigo from './Codigo'
import Entrega from './Entrega'
import Historial from './Historial'
import Perfil from './Perfil'
import Wallet from '../comun/Wallet'

const SCREENS = {
  bienvenida: Bienvenida,
  crear: CrearCuenta,
  wallet: Wallet,
  inicio: Inicio,
  cotizar: Cotizar,
  cajeros: Cajeros,
  pagar: Pagar,
  codigo: Codigo,
  entrega: Entrega,
  historial: Historial,
  perfil: Perfil,
}

// map: pantalla → pestaña activa (solo las pantallas que muestran el menú)
// target: pestaña → pantalla a la que lleva
const TABS = {
  items: [
    { id: 'inicio', label: 'tab.inicio', Icon: House },
    { id: 'cajeros', label: 'tab.cajeros', Icon: MapPin },
    { id: 'retirar', label: 'tab.retirar', Icon: QrCode },
    { id: 'historial', label: 'tab.historial', Icon: Clock },
    { id: 'perfil', label: 'tab.perfil', Icon: User },
  ],
  map: { inicio: 'inicio', historial: 'historial', perfil: 'perfil' },
  target: { inicio: 'inicio', cajeros: 'cajeros', retirar: 'cotizar', historial: 'historial', perfil: 'perfil' },
}

// Estado de la app: monto, cotización fijada, cajero elegido, orden y código de retiro en curso
const INICIAL = { usd: 100, quote: null, agents: null, agentId: null, order: null, withdrawal: null, introPending: false, saldoOculto: false, despuesDeAcceso: null, despuesDeWallet: null }

export default function TuristaApp() {
  const [state, setState] = useState(INICIAL)
  return (
    <BackendProvider app="turista">
      <PhoneApp screens={SCREENS} initial="bienvenida" tabs={TABS} state={state} setState={setState} />
    </BackendProvider>
  )
}
