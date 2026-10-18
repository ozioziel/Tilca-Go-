import cors from '@fastify/cors'
import Fastify from 'fastify'
import { ZodError } from 'zod'
import { config } from './config'
import { HttpError } from './lib/errors'
import { adminRoutes } from './modules/admin'
import { agentRoutes } from './modules/agents'
import { authRoutes } from './modules/auth'
import { faucetRoutes } from './modules/faucet'
import { orderRoutes } from './modules/orders'
import { quoteRoutes } from './modules/quotes'

// Los montos internos son bigint; en JSON salen como texto
const json = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x))

export async function buildApp() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } })
  app.setReplySerializer(json)
  await app.register(cors, { origin: config.CORS_ORIGIN.split(',') })

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) return reply.status(err.status).send({ error: err.code, message: err.message })
    if (err instanceof ZodError) return reply.status(400).send({ error: 'validation', message: 'Datos inválidos', issues: err.issues })
    if (err instanceof Error && /Monto USDC inválido|Tasa inválida|mayor que cero/.test(err.message)) {
      return reply.status(400).send({ error: 'validation', message: err.message })
    }
    req.log.error(err)
    return reply.status(500).send({ error: 'internal', message: 'Error interno' })
  })

  app.get('/health', async () => ({
    ok: true,
    network: config.STELLAR_NETWORK_PASSPHRASE,
    escrow: config.ESCROW_CONTRACT_ID,
    asset: `${config.USDC_ASSET_CODE}:${config.USDC_ASSET_ISSUER}`,
    asset_sac: config.USDC_SAC_ID,
    faucet: Boolean(config.FAUCET_ISSUER_SECRET),
  }))

  await app.register(authRoutes)
  await app.register(quoteRoutes)
  await app.register(agentRoutes)
  await app.register(orderRoutes)
  await app.register(adminRoutes)
  if (config.FAUCET_ISSUER_SECRET) await app.register(faucetRoutes)
  return app
}
