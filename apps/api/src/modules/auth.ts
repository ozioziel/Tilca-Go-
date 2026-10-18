import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { config } from '../config'
import { pool } from '../db/pool'
import { hashSecret, otpCode, sessionToken } from '../lib/codes'
import { badRequest, forbidden, unauthorized } from '../lib/errors'

export type Role = 'tourist' | 'agent' | 'admin'
export interface User {
  id: string
  email: string
  role: Role
}

const OTP_TTL_MIN = 10
const OTP_MAX_ATTEMPTS = 5
const SESSION_DAYS = 7

/** Usuario autenticado por `Authorization: Bearer <token>`; opcionalmente exige un rol. */
export async function requireUser(req: FastifyRequest, ...roles: Role[]): Promise<User> {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) throw unauthorized()
  const { rows } = await pool.query<User>(
    `SELECT u.id, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND u.status = 'ACTIVE'`,
    [hashSecret(token, config.CODE_PEPPER)],
  )
  const user = rows[0]
  if (!user) throw unauthorized('La sesión venció; vuelve a iniciar sesión')
  if (roles.length && !roles.includes(user.role)) throw forbidden()
  return user
}

const emailSchema = z.string().trim().toLowerCase().email()

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/otp/request', async (req) => {
    const { email } = z.object({ email: emailSchema }).parse(req.body)
    const code = otpCode()
    await pool.query(`INSERT INTO otp_codes (email, code_hash, expires_at) VALUES ($1, $2, now() + make_interval(mins => $3))`, [
      email,
      hashSecret(code, config.CODE_PEPPER),
      OTP_TTL_MIN,
    ])
    // En producción el código se envía por correo; en la demo se devuelve para no depender de un proveedor
    if (config.OTP_DEV) return { sent: true, devCode: code }
    req.log.info({ email }, 'OTP generado (envío de correo pendiente de integrar)')
    return { sent: true }
  })

  app.post('/auth/otp/verify', async (req) => {
    const { email, code } = z.object({ email: emailSchema, code: z.string().regex(/^\d{6}$/) }).parse(req.body)
    const { rows } = await pool.query<{ id: string; code_hash: string; attempts: number }>(
      `SELECT id, code_hash, attempts FROM otp_codes
       WHERE email = $1 AND consumed_at IS NULL AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [email],
    )
    const otp = rows[0]
    if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) throw badRequest('otp_invalid', 'Pide un código nuevo')
    if (otp.code_hash !== hashSecret(code, config.CODE_PEPPER)) {
      await pool.query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1', [otp.id])
      throw badRequest('otp_invalid', 'El código no es correcto')
    }
    // Consumo atómico: el mismo código no abre dos sesiones
    const consumed = await pool.query('UPDATE otp_codes SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL', [otp.id])
    if (consumed.rowCount === 0) throw badRequest('otp_invalid', 'Pide un código nuevo')

    const role: Role = config.ADMIN_EMAILS.includes(email) ? 'admin' : 'tourist'
    const { rows: users } = await pool.query<User>(
      `INSERT INTO users (email, role) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id, email, role`,
      [email, role],
    )
    const token = sessionToken()
    await pool.query(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))`, [
      hashSecret(token, config.CODE_PEPPER),
      users[0].id,
      SESSION_DAYS,
    ])
    return { token, user: users[0] }
  })

  app.get('/me', async (req) => {
    const user = await requireUser(req)
    const { rows } = await pool.query('SELECT address, network, usdc_trustline_ok FROM wallets WHERE user_id = $1 ORDER BY created_at', [user.id])
    return { user, wallets: rows }
  })
}
