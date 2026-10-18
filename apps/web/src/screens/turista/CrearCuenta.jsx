import Acceso from '../comun/Acceso'

// Registro / inicio de sesión del turista: solo correo + código (v3). La verificación de
// identidad adicional queda para antes de un piloto con dinero real.
export default function CrearCuenta({ nav, state, setState }) {
  const listo = () => {
    const destino = state.despuesDeAcceso
    if (destino) {
      setState((s) => ({ ...s, despuesDeAcceso: null }))
      nav.go(destino, { replace: true })
      return
    }
    setState((s) => ({ ...s, introPending: true }))
    nav.go('inicio', { root: true, plain: true })
  }
  return <Acceso nav={nav} onDone={listo} />
}
