import { useState } from 'react'
import { House, ListOrdered, ScanLine, TrendingUp, User } from 'lucide-react'
import PhoneApp from '../../components/PhoneApp'
import InicioCajero from './InicioCajero'
import Escanear from './Escanear'
import Validar from './Validar'
import Ganancias from './Ganancias'

const SCREENS = {
  inicio: InicioCajero,
  escanear: Escanear,
  validar: Validar,
  ganancias: Ganancias,
}

const TABS = {
  items: [
    { id: 'inicio', label: 'tab.inicio', Icon: House },
    { id: 'escanear', label: 'tab.escanear', Icon: ScanLine },
    { id: 'ordenes', label: 'tab.ordenes', Icon: ListOrdered },
    { id: 'ganancias', label: 'tab.ganancias', Icon: TrendingUp },
    { id: 'perfil', label: 'tab.perfil', Icon: User },
  ],
  map: { inicio: 'inicio', escanear: 'escanear', ganancias: 'ganancias' },
  // «Órdenes» y «Perfil» del cajero todavía no están en el prototipo
  target: { inicio: 'inicio', escanear: 'escanear', ganancias: 'ganancias' },
}

export default function CajeroApp() {
  const [state, setState] = useState({ disponible: true })
  return <PhoneApp screens={SCREENS} initial="inicio" tabs={TABS} state={state} setState={setState} />
}
