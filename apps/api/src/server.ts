import { buildApp } from './app'
import { config } from './config'
import { migrate } from './db/migrate'
import { pool } from './db/pool'
import { readContract } from './stellar/escrow'
import { startWorkers } from './stellar/sync'
import { scValToNative } from '@stellar/stellar-sdk'

const app = await buildApp()
await migrate()

// La comisión de la plataforma del backend debe coincidir con la del contrato desplegado
const onchain = await readContract(config.ESCROW_CONTRACT_ID, 'get_config', []).catch(() => null)
if (!onchain) {
  app.log.warn('No pude leer la configuración del escrow: ¿el contrato existe en esta red? (testnet se reinicia; vuelve a correr el seed)')
} else {
  const c = scValToNative(onchain) as { fee_bps: number; token: string }
  if (Number(c.fee_bps) !== config.FEE_BPS_PLATFORM) app.log.warn(`FEE_BPS_PLATFORM=${config.FEE_BPS_PLATFORM} pero el contrato usa ${c.fee_bps}`)
  if (c.token !== config.USDC_SAC_ID) app.log.warn(`El contrato acepta ${c.token}, no ${config.USDC_SAC_ID}`)
}

const stop = startWorkers((msg, err) => app.log.error({ err }, msg))
await app.listen({ port: config.PORT, host: '0.0.0.0' })

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, async () => {
    stop()
    await app.close()
    await pool.end()
    process.exit(0)
  })
}
