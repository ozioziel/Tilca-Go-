import { Asset, BASE_FEE, Keypair, Operation, rpc, TransactionBuilder } from '@stellar/stellar-sdk'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { config } from '../config'
import { audit, pool } from '../db/pool'
import { HttpError } from '../lib/errors'
import { hasUsdcTrustline, server, withRetry } from '../stellar/escrow'
import { stellarAddress } from './agents'
import { requireUser } from './auth'

/**
 * Faucet de la demo (solo testnet): envía activo de prueba a la wallet de un usuario
 * con sesión, como mucho una vez cada 10 minutos. Se activa con FAUCET_ISSUER_SECRET.
 */
export async function faucetRoutes(app: FastifyInstance) {
  const issuer = Keypair.fromSecret(config.FAUCET_ISSUER_SECRET!)
  if (issuer.publicKey() !== config.USDC_ASSET_ISSUER) throw new Error('FAUCET_ISSUER_SECRET no corresponde a USDC_ASSET_ISSUER')

  app.post('/dev/faucet', async (req) => {
    const user = await requireUser(req)
    const { wallet_address } = z.object({ wallet_address: stellarAddress }).parse(req.body)
    const recent = await pool.query(
      `SELECT 1 FROM audit_logs WHERE actor = $1 AND action = 'faucet' AND occurred_at > now() - interval '10 minutes'`,
      [user.id],
    )
    if (recent.rowCount) throw new HttpError(429, 'faucet_wait', 'Ya pediste saldo de prueba; espera unos minutos')
    if (!(await hasUsdcTrustline(wallet_address))) {
      throw new HttpError(400, 'no_trustline', `La wallet todavía no tiene la trustline a ${config.USDC_ASSET_CODE}`)
    }
    const account = await withRetry(() => server.getAccount(issuer.publicKey()))
    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: config.STELLAR_NETWORK_PASSPHRASE })
      .addOperation(
        Operation.payment({
          destination: wallet_address,
          asset: new Asset(config.USDC_ASSET_CODE, config.USDC_ASSET_ISSUER),
          amount: String(config.FAUCET_AMOUNT),
        }),
      )
      .setTimeout(60)
      .build()
    tx.sign(issuer)
    const sent = await server.sendTransaction(tx)
    if (sent.status === 'ERROR') throw new HttpError(502, 'faucet_failed', 'La red rechazó el envío de prueba')
    const final = await server.pollTransaction(sent.hash, { attempts: 20, sleepStrategy: () => 1000 })
    if (final.status !== rpc.Api.GetTransactionStatus.SUCCESS) throw new HttpError(502, 'faucet_failed', 'El envío de prueba no se confirmó')
    await audit(pool, user.id, 'faucet', wallet_address, { amount: config.FAUCET_AMOUNT, hash: sent.hash })
    return { sent: config.FAUCET_AMOUNT, asset: config.USDC_ASSET_CODE, hash: sent.hash, url: `${config.STELLAR_EXPLORER}/tx/${sent.hash}` }
  })
}
