import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, loadSession, request, saveSession } from './api'
import { connectWallet, createDeviceWallet, forgetDeviceWallet, importDeviceWallet, signXdr, walletBalances, walletStatus, WalletError } from './wallet'

/**
 * Estado compartido de una app (turista o cajero): sesión, configuración del
 * backend, tasa vigente y wallet. Las pantallas lo leen con useBackend().
 */
const BackendContext = createContext(null)

export function BackendProvider({ app, children }) {
  const [session, setSession] = useState(() => loadSession(app))
  const [health, setHealth] = useState(null)
  const [rate, setRate] = useState(null)
  const [offline, setOffline] = useState(false)
  const [wallet, setWallet] = useState({ checked: false, kind: null, installed: false, address: null, passphrase: null })
  const [balance, setBalance] = useState(null)
  const sessionRef = useRef(session)
  sessionRef.current = session

  const logout = useCallback(() => {
    saveSession(app, null)
    sessionRef.current = null
    setSession(null)
  }, [app])

  const api = useCallback(
    async (method, path, body) => {
      try {
        return await request(method, path, { body, token: sessionRef.current?.token })
      } catch (err) {
        if (err instanceof ApiError && err.status === 401 && sessionRef.current) logout()
        throw err
      }
    },
    [logout],
  )

  // Configuración pública y tasa (se refresca cada minuto)
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const [h, r] = await Promise.all([request('GET', '/health'), request('GET', '/rate')])
        if (!alive) return
        setHealth(h)
        setRate(r)
        setOffline(false)
      } catch {
        if (alive) setOffline(true)
      }
    }
    load()
    const id = setInterval(load, 60_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  const refreshBalance = useCallback(
    async (address) => {
      const addr = address ?? wallet.address
      if (!addr || !health) return null
      const b = await walletBalances(addr, health.asset).catch(() => null)
      setBalance(b)
      return b
    },
    [wallet.address, health],
  )

  const checkWallet = useCallback(async () => {
    const st = await walletStatus(app).catch(() => ({ kind: null, installed: false, address: null, passphrase: null }))
    setWallet({ checked: true, ...st })
    return st
  }, [app])

  useEffect(() => {
    checkWallet()
  }, [checkWallet])

  useEffect(() => {
    if (wallet.address && health) refreshBalance(wallet.address)
  }, [wallet.address, health, refreshBalance])

  const connect = useCallback(async () => {
    await connectWallet()
    return checkWallet()
  }, [checkWallet])

  // Wallet de prueba en el dispositivo (app móvil): crear, importar, olvidar y pedir TUSDC al faucet de la demo
  const createDevice = useCallback(async () => {
    if (!health) throw new WalletError('offline', 'Sin conexión con TilcaGo')
    await createDeviceWallet(app, health.asset)
    return checkWallet()
  }, [app, health, checkWallet])

  const importDevice = useCallback(
    async (secret) => {
      if (!health) throw new WalletError('offline', 'Sin conexión con TilcaGo')
      await importDeviceWallet(app, secret, health.asset)
      return checkWallet()
    },
    [app, health, checkWallet],
  )

  const forgetDevice = useCallback(async () => {
    await forgetDeviceWallet(app)
    setBalance(null)
    return checkWallet()
  }, [app, checkWallet])

  const requestOtp = useCallback((email) => request('POST', '/auth/otp/request', { body: { email } }), [])

  const login = useCallback(
    async (email, code) => {
      const res = await request('POST', '/auth/otp/verify', { body: { email, code } })
      const s = { token: res.token, user: res.user }
      saveSession(app, s)
      sessionRef.current = s // disponible ya para la llamada siguiente, sin esperar al render
      setSession(s)
      return s
    },
    [app],
  )

  /**
   * Pide al API la transacción del contrato, la firma con la wallet y la envía
   * con gas patrocinado. Verifica antes que la wallet sea la de la orden.
   */
  const sendTx = useCallback(
    async (orderId, action, body = {}, onPhase = () => {}) => {
      onPhase('preparando')
      const prepared = await api('POST', `/orders/${orderId}/tx/${action}`, body)
      const st = await checkWallet()
      if (!st.address) throw new WalletError('not_connected', 'Conecta tu wallet para firmar')
      if (st.address !== prepared.source) {
        throw new WalletError('wrong_account', `Cambia en Freighter a la cuenta ${prepared.source.slice(0, 4)}…${prepared.source.slice(-4)}`)
      }
      if (st.passphrase && st.passphrase !== prepared.network_passphrase) {
        throw new WalletError('wrong_network', 'Cambia Freighter a Testnet')
      }
      onPhase('firmando')
      const signed = await signXdr(app, prepared.xdr, prepared.network_passphrase, prepared.source)
      onPhase('enviando')
      const res = await api('POST', '/tx/submit', { xdr: signed })
      refreshBalance(st.address)
      return res
    },
    [app, api, checkWallet, refreshBalance],
  )

  const value = useMemo(
    () => ({ app, session, user: session?.user ?? null, health, rate, offline, wallet, balance, api, login, logout, requestOtp, checkWallet, connect, refreshBalance, sendTx, createDevice, importDevice, forgetDevice }),
    [app, session, health, rate, offline, wallet, balance, api, login, logout, requestOtp, checkWallet, connect, refreshBalance, sendTx, createDevice, importDevice, forgetDevice],
  )
  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>
}

export const useBackend = () => useContext(BackendContext)

/** Ejecuta `fn` ahora y cada `ms` mientras `active` sea true. */
export function usePolling(fn, ms, active = true) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (!active) return
    let alive = true
    const tick = async () => {
      try {
        await ref.current()
      } catch {
        /* se reintenta en el próximo ciclo */
      }
    }
    tick()
    const id = setInterval(() => alive && tick(), ms)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [ms, active])
}

/** Texto de error para mostrar al usuario. */
export const errorText = (err) => (err instanceof ApiError || err instanceof WalletError ? err.message : 'Algo salió mal. Intenta de nuevo.')
