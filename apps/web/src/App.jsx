import { useEffect, useState } from 'react'
import { Globe, Smartphone, Store } from 'lucide-react'
import TuristaApp from './screens/turista'
import CajeroApp from './screens/cajero'
import Landing from './screens/web/Landing'
import { LangToggle, Logo } from './components/ui'
import { useI18n } from './i18n'
import { isNative } from './lib/platform'

// Rutas con hash para no necesitar servidor: #/ (web), #/app (turista), #/cajero
// En la app nativa no hay landing: se abre directo la app del turista
function rutaActual() {
  const h = window.location.hash
  if (h.startsWith('#/app')) return 'app'
  if (h.startsWith('#/cajero')) return 'cajero'
  return isNative ? 'app' : 'web'
}

function useRuta() {
  const [ruta, setRuta] = useState(rutaActual)
  useEffect(() => {
    const onChange = () => setRuta(rutaActual())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return ruta
}

/** En computadora muestra la app dentro de un celular, con accesos a las tres vistas. */
function Escenario({ ruta, children }) {
  const { t } = useI18n()
  const links = [
    { href: '#/app', id: 'app', label: t('shell.turista'), Icon: Smartphone },
    { href: '#/cajero', id: 'cajero', label: t('shell.cajero'), Icon: Store },
    { href: '#/', id: 'web', label: t('shell.web'), Icon: Globe },
  ]
  return (
    <div className="escenario">
      <aside className="escenario__info">
        <Logo onClick={() => (window.location.hash = '#/')} />
        <span className="overline">{t('shell.prototipo')}</span>
        <nav className="escenario__links">
          {links.map(({ href, id, label, Icon }) => (
            <a key={id} href={href} className={`glass ${ruta === id ? 'is-on' : ''}`}>
              <Icon size={18} aria-hidden="true" /> {label}
            </a>
          ))}
        </nav>
        <p className="body-s muted">{t('shell.nota')}</p>
        <LangToggle />
      </aside>
      {children}
    </div>
  )
}

export default function App() {
  const ruta = useRuta()

  useEffect(() => {
    if (ruta !== 'web') window.scrollTo(0, 0)
  }, [ruta])

  if (ruta === 'web') return <Landing />
  // En el celular la app ocupa toda la pantalla, sin el marco de escritorio
  if (isNative) return ruta === 'app' ? <TuristaApp key="turista" /> : <CajeroApp key="cajero" />
  return <Escenario ruta={ruta}>{ruta === 'app' ? <TuristaApp key="turista" /> : <CajeroApp key="cajero" />}</Escenario>
}
