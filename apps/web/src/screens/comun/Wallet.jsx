import { useEffect, useState } from 'react'
import { ExternalLink, RefreshCw, Wallet as WalletIcon } from 'lucide-react'
import Tilcayo from '../../components/Tilcayo'
import PasosEntrega from '../../components/PasosEntrega'
import { Button, Header } from '../../components/ui'
import { errorText, useBackend } from '../../lib/backend'
import { FREIGHTER_URL, shortAddress } from '../../lib/wallet'
import { useI18n } from '../../i18n'

/**
 * Conectar la wallet y comprobar que sirve para pagar: Freighter instalada,
 * cuenta autorizada, red Testnet y trustline al USDC correcto (v3 §4 paso 5).
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

export default function Wallet({ nav, state, esperada }) {
  const { t, num } = useI18n()
  const { wallet, balance, connect, checkWallet, refreshBalance } = useBackend()
  const c = useWalletChecks(esperada)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    checkWallet()
  }, [checkWallet])

  const conectar = async () => {
    setCargando(true)
    setError('')
    try {
      const st = await connect()
      if (st.address) await refreshBalance(st.address)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setCargando(false)
    }
  }

  const revisar = async () => {
    setCargando(true)
    const st = await checkWallet()
    if (st.address) await refreshBalance(st.address)
    setCargando(false)
  }

  const pasos = [
    { label: c.instalada ? t('wallet.instalada') : t('wallet.instalar'), hecho: c.instalada, activo: !c.instalada },
    {
      label: c.conectada ? t('wallet.cuenta', { address: shortAddress(wallet.address) }) : t('wallet.conectar'),
      hecho: c.cuentaOk,
      activo: c.instalada && !c.cuentaOk,
    },
    { label: c.redOk ? t('wallet.red') : t('wallet.redMal'), hecho: c.conectada && c.redOk, activo: c.conectada && !c.redOk },
    {
      label: c.usdcOk ? t('wallet.saldo', { amount: num(balance.usdc), asset: c.asset }) : t('wallet.sinUsdc', { asset: c.asset }),
      hecho: c.usdcOk,
      activo: c.conectada && c.redOk && !c.usdcOk,
    },
  ]

  const volver = () => (state?.despuesDeWallet ? nav.go(state.despuesDeWallet, { replace: true }) : nav.back())

  return (
    <div className="pantalla">
      <Header title={t('wallet.titulo')} onBack={nav.back} />
      <div className="codigo__cabeza">
        <Tilcayo pose={c.lista ? 'feliz' : 'asomado'} className="codigo__gato brinca" />
        <h1 className="display-m">{c.lista ? t('wallet.listaTitulo') : t('wallet.tituloLargo')}</h1>
        <p className="body-s muted">{t('wallet.texto')}</p>
      </div>

      <div className="ticket glass">
        <span className="ticket__codigo">
          <WalletIcon size={20} aria-hidden="true" />
          <span className="h-s">Freighter · Testnet</span>
        </span>
        <PasosEntrega pasos={pasos} />
        {wallet.address && esperada && wallet.address !== esperada && (
          <p className="body-s text-terra">{t('wallet.otraCuenta', { address: shortAddress(esperada) })}</p>
        )}
      </div>

      {error && <p className="nota nota--error" role="alert">{error}</p>}

      <div className="stack-10">
        {!c.instalada ? (
          <a className="btn btn--primary btn--link" href={FREIGHTER_URL} target="_blank" rel="noreferrer">
            {t('wallet.instalarBoton')} <ExternalLink size={16} aria-hidden="true" />
          </a>
        ) : c.lista ? (
          <Button onClick={volver}>{t('wallet.continuar')}</Button>
        ) : (
          <Button disabled={cargando} onClick={conectar} className={cargando ? 'is-cargando' : ''} icon={!cargando}>
            {t('wallet.conectarBoton')}
          </Button>
        )}
        <Button variant="secondary" icon={false} disabled={cargando} onClick={revisar}>
          <RefreshCw size={16} aria-hidden="true" /> {t('wallet.revisar')}
        </Button>
      </div>
      {!c.usdcOk && c.conectada && <p className="label-s muted centrado">{t('wallet.ayudaUsdc', { asset: c.asset })}</p>}
    </div>
  )
}
