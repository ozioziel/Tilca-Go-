import { useState } from 'react'
import { Clock, House, MapPin, QrCode, User } from 'lucide-react'
import PhoneApp from '../../components/PhoneApp'
import Bienvenida from './Bienvenida'
import CrearCuenta from './CrearCuenta'
import Inicio from './Inicio'
import Cotizar from './Cotizar'
import Cajeros from './Cajeros'
import Pagar from './Pagar'
import Codigo from './Codigo'
import Historial from './Historial'
import Perfil from './Perfil'

const SCREENS = {
  bienvenida: Bienvenida,
  crear: CrearCuenta,
  inicio: Inicio,
  cotizar: Cotizar,
  cajeros: Cajeros,
  pagar: Pagar,
  codigo: Codigo,
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
  target: { inicio: 'inicio', cajeros: 'cajeros', retirar: 'codigo', historial: 'historial', perfil: 'perfil' },
}

export default function TuristaApp() {
  const [state, setState] = useState({ usd: 100, cajeroId: 'sc', metodo: 'usdc', introPending: false, saldoOculto: false })
  return <PhoneApp screens={SCREENS} initial="bienvenida" tabs={TABS} state={state} setState={setState} />
}
