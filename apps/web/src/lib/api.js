// Cliente del backend (apps/api). La URL se configura con VITE_API_URL.
export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

/** Llama al API. `token` va como Bearer. Lanza ApiError con el mensaje del servidor. */
export async function request(method, path, { body, token } = {}) {
  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'offline', 'No hay conexión con el servidor de TilcaGo')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'error', data.message ?? `Error ${res.status}`)
  return data
}

// La sesión se guarda por app (turista / cajero) para poder probar ambas en el mismo navegador
const tokenKey = (app) => `tilcago.session.${app}`

export function loadSession(app) {
  try {
    const raw = localStorage.getItem(tokenKey(app))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSession(app, session) {
  try {
    if (session) localStorage.setItem(tokenKey(app), JSON.stringify(session))
    else localStorage.removeItem(tokenKey(app))
  } catch {
    /* sin almacenamiento: la sesión dura lo que dure la pestaña */
  }
}
