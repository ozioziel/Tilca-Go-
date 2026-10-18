import { useEffect, useState } from 'react'
import { Download, ExternalLink, KeyRound, RefreshCw, Smartphone, Trash2, Wallet as WalletIcon } from 'lucide-react'
import Tilcayo from '../../components/Tilcayo'
import PasosEntrega from '../../components/PasosEntrega'
import { Button, Field, Header } from '../../components/ui'
import { errorText, useBackend } from '../../lib/backend'
import { isNative } from '../../lib/platform'
import { FREIGHTER_URL, shortAddress } from '../../lib/wallet'
import { useI18n } from '../../i18n'

/**
 * Estado de la wallet para pagar: conectada, cuenta correcta, red Testnet y trustline al USDC.
 * `esperada`: dirección que debe usarse (la del cajero en su app).
 */
export function useWalletChecks(esperada) {
  const { wallet, balance, health } = useBackend()
  const asset = health?.asset?.split(':')[0] ?? 'USDC'
  const redOk = wallet.passphrase ? wallet.passphrase === health?.network : Boolean(wallet.address)
  const cuentaOk = Boolean(wallet.address) && (!esperada || wallet.address === esperada)
  const usdcOk = balance?.usdc !== null && balance?.usdc !== undefined
  return { asset, instalada: wallet.installed, conectada: Boolean(wallet.address), cuentaOk, redOk, usdcOk, lista: wallet.installed && cuentaOk && redOk && usdcOk }
}

/**
 * Conectar la wallet (v3 §4 paso 5). En la web: Freighter. En la app móvil: una
 * wallet de prueba de testnet guardada en el dispositivo, creada o importada.
 */
export default function Wallet({ nav, state, esperada }) {
  const { t, num } = useI18n()
  const { wallet, balance, health, user, api, connect, checkWallet, refreshBalance, createDevice, importDevice, forgetDevice, addAssetTrustline } = useBackend()
  const c = useWalletChecks(esperada)
  const [cargando, setCargando] = useState('')
  const [importando, setImportando] = useState(false)
  const [secreto, setSecreto] = useState('')
  const [error, setError] = useState('')
  const enDispositivo = wallet.kind === 'device'
  // La wallet de prueba se ofrece en la app móvil y, en la web, si no hay Freighter
  const ofrecerDispositivo = isNative || !wallet.installed || enDispositivo

  useEffect(() => {
    checkWallet()
  }, [checkWallet])

  const accion = (nombre, fn) => async () => {
    setCargando(nombre)
    setError('')
    try {
      const st = await fn()
      if (st?.address) await refreshBalance(st.address)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setCargando('')
    }
  }

  const pedirSaldo = accion('faucet', async () => {
    await api('POST', '/dev/faucet', { wallet_address: wallet.address })
    return { address: wallet.address }
  })

  const pasos = [
    {
      label: enDispositivo ? t('wallet.dispositivo') : c.instalada ? t('wallet.instalada') : ofrecerDispositivo ? t('wallet.crearPaso') : t('wallet.instalar'),
      hecho: c.instalada,
      activo: !c.instalada,
    },
    {
      label: c.conectada ? t('wallet.cuenta', { address: shortAddress(wallet.address) }) : t('wallet.conectar'),
      hecho: c.cuentaOk,
      activo: c.instalada && !c.cuentaOk,
    },
    { label: c.redOk ? t('wallet.red') : t('wallet.redMal'), hecho: c.conectada && c.redOk, activo: c.conectada && !c.redOk },
    {
      label: c.usdcOk ? t('wallet.saldo', { amount: num(balance.usdc), asset: c.asset }) : t('wallet.sinUsdc', { asset: c.asset }),
      hecho: c.usdcOk && balance.usdc > 0,
      activo: c.conectada && c.redOk && !(c.usdcOk && balance.usdc > 0),
    },
  ]

  const volver = () => (state?.despuesDeWallet ? nav.go(state.despuesDeWallet, { replace: true }) : nav.back())
  const sinSaldo = c.conectada && (!c.usdcOk || balance.usdc === 0)

  return (
    <div className="pantalla">
      <Header title={t('wallet.titulo')} onBack={nav.back} />
      <div className="codigo__cabeza">
        <Tilcayo pose={c.lista ? 'feliz' : 'asomado'} className="codigo__gato brinca" />
        <h1 className="display-m">{c.lista ? t('wallet.listaTitulo') : t('wallet.tituloLargo')}</h1>
        <p className="body-s muted">{ofrecerDispositivo ? t('wallet.textoDispositivo') : t('wallet.texto')}</p>
      </div>

      <div className="ticket glass">
        <span className="ticket__codigo">
          {enDispositivo || (ofrecerDispositivo && !c.instalada) ? <Smartphone size={20} aria-hidden="true" /> : <WalletIcon size={20} aria-hidden="true" />}
          <span className="h-s">{enDispositivo || (ofrecerDispositivo && !c.instalada) ? t('wallet.deDispositivo') : 'Freighter · Testnet'}</span>
        </span>
        <PasosEntrega pasos={pasos} />
        {wallet.address && esperada && wallet.address !== esperada && (
          <p className="body-s text-terra">{t('wallet.otraCuenta', { address: shortAddress(esperada) })}</p>
        )}
      </div>

      {importando && (
        <div className="glass card stack-10 entra">
          <Field label={t('wallet.claveSecreta')} value={secreto} onChange={setSecreto} type="password" autoComplete="off" placeholder="S…" />
          <p className="label-s muted">{t('wallet.claveNota')}</p>
          <Button disabled={!secreto || Boolean(cargando)} className={cargando === 'importar' ? 'is-cargando' : ''} onClick={accion('importar', () => importDevice(secreto))}>
            {t('wallet.importar')}
          </Button>
        </div>
      )}

      {error && <p className="nota nota--error" role="alert">{error}</p>}

      <div className="stack-10">
        {c.lista && !sinSaldo ? (
          <Button onClick={volver}>{t('wallet.continuar')}</Button>
        ) : !c.instalada && ofrecerDispositivo ? (
          <Button disabled={Boolean(cargando)} onClick={accion('crear', createDevice)} className={cargando === 'crear' ? 'is-cargando' : ''} icon={!cargando}>
            {cargando === 'crear' ? t('wallet.creando') : t('wallet.crear')}
          </Button>
        ) : !c.instalada ? (
          <a className="btn btn--primary btn--link" href={FREIGHTER_URL} target="_blank" rel="noreferrer">
            {t('wallet.instalarBoton')} <ExternalLink size={16} aria-hidden="true" />
          </a>
        ) : !c.conectada || !c.cuentaOk ? (
          <Button disabled={Boolean(cargando)} onClick={accion('conectar', connect)} className={cargando === 'conectar' ? 'is-cargando' : ''} icon={!cargando}>
            {t('wallet.conectarBoton')}
          </Button>
        ) : !c.redOk ? (
          // Con la red equivocada nada más funciona: primero hay que cambiarla en Freighter
          <p className="nota nota--beige">{t('wallet.cambiarRed')}</p>
        ) : !c.usdcOk ? (
          <Button disabled={Boolean(cargando)} onClick={accion('trustline', addAssetTrustline)} className={cargando === 'trustline' ? 'is-cargando' : ''} icon={!cargando}>
            {cargando === 'trustline' ? t('wallet.agregandoActivo') : t('wallet.agregarActivo', { asset: c.asset })}
          </Button>
        ) : sinSaldo && health?.faucet && user ? (
          <Button disabled={Boolean(cargando)} onClick={pedirSaldo} className={cargando === 'faucet' ? 'is-cargando' : ''} icon={!cargando}>
            <Download size={16} aria-hidden="true" /> {t('wallet.faucet', { asset: c.asset })}
          </Button>
        ) : null}

        {ofrecerDispositivo && !enDispositivo && !importando && (
          <Button variant="secondary" icon={false} onClick={() => setImportando(true)}>
            <KeyRound size={16} aria-hidden="true" /> {t('wallet.importarClave')}
          </Button>
        )}
        <Button variant="secondary" icon={false} disabled={Boolean(cargando)} onClick={accion('revisar', checkWallet)}>
          <RefreshCw size={16} aria-hidden="true" /> {t('wallet.revisar')}
        </Button>
        {enDispositivo && (
          <button type="button" className="link centrado" onClick={accion('olvidar', forgetDevice)}>
            <Trash2 size={14} aria-hidden="true" /> {t('wallet.olvidar')}
          </button>
        )}
      </div>
      {sinSaldo && !health?.faucet && <p className="label-s muted centrado">{t('wallet.ayudaUsdc', { asset: c.asset })}</p>}
      {sinSaldo && health?.faucet && !user && <p className="label-s muted centrado">{t('wallet.faucetEntrar')}</p>}
    </div>
  )
}
