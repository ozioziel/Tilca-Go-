import 'dotenv/config'
import { z } from 'zod'

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1')

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  STELLAR_RPC_URL: z.string().url(),
  STELLAR_NETWORK_PASSPHRASE: z.string().min(1),
  STELLAR_EXPLORER: z.string().default('https://stellar.expert/explorer/testnet'),
  ESCROW_CONTRACT_ID: z.string().startsWith('C'),
  USDC_SAC_ID: z.string().startsWith('C'),
  USDC_ASSET_CODE: z.string().min(1),
  USDC_ASSET_ISSUER: z.string().startsWith('G'),
  PLATFORM_FEE_ADDRESS: z.string().startsWith('G'),
  ADMIN_ADDRESS: z.string().startsWith('G').optional(),
  GAS_SPONSOR_SECRET: z.string().startsWith('S'),
  GAS_MAX_FEE_STROOPS: z.coerce.number().int().positive().default(2_000_000),

  RATE_REF_BOB: z.string().regex(/^\d+(\.\d{1,4})?$/).default('10.00'),
  MARGIN_BPS: z.coerce.number().int().min(0).max(1000).default(50),
  FEE_BPS_TOTAL: z.coerce.number().int().min(0).max(1000).default(150),
  FEE_BPS_PLATFORM: z.coerce.number().int().min(0).max(1000).default(50),
  QUOTE_TTL_MIN: z.coerce.number().int().positive().default(10),
  ORDER_TTL_MIN: z.coerce.number().int().positive().default(120),

  OTP_DEV: bool,
  ADMIN_EMAILS: z
    .string()
    .default('')
    .transform((s) => s.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)),
  CODE_PEPPER: z.string().min(8),
  // La app móvil (Capacitor) llama desde https://localhost (Android) y capacitor://localhost (iOS)
  CORS_ORIGIN: z.string().default('http://localhost:5173,https://localhost,capacitor://localhost'),
  SYNC_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  // Solo testnet: clave del emisor del activo de prueba para el faucet de la demo (vacío = faucet apagado)
  FAUCET_ISSUER_SECRET: z.preprocess((v) => v || undefined, z.string().startsWith('S').optional()),
  FAUCET_AMOUNT: z.coerce.number().int().positive().max(1000).default(100),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('Configuración inválida. Revisa apps/api/.env (o ejecuta scripts/seed-testnet.sh):')
  console.error(z.prettifyError(parsed.error))
  process.exit(1)
}

export const config = parsed.data

if (config.FEE_BPS_PLATFORM > config.FEE_BPS_TOTAL) {
  console.error('FEE_BPS_PLATFORM no puede ser mayor que FEE_BPS_TOTAL')
  process.exit(1)
}
