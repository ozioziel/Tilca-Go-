-- Esquema inicial de TilcaGo (ver tilcago_v3.md §8).
-- Montos: USDC en unidades mínimas (7 decimales) y bolivianos en centavos, siempre BIGINT.

CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL UNIQUE,
  role        text NOT NULL DEFAULT 'tourist' CHECK (role IN ('tourist', 'agent', 'admin')),
  status      text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE otp_codes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL,
  code_hash    text NOT NULL,
  attempts     int NOT NULL DEFAULT 0,
  expires_at   timestamptz NOT NULL,
  consumed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX otp_codes_email_idx ON otp_codes (email, created_at DESC);

CREATE TABLE sessions (
  token_hash  text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users (id),
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wallets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users (id),
  address      text NOT NULL,
  network      text NOT NULL,
  usdc_trustline_ok boolean NOT NULL DEFAULT false,
  verified_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, address)
);

CREATE TABLE agents (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL UNIQUE REFERENCES users (id),
  type                 text NOT NULL CHECK (type IN ('PERSON', 'BUSINESS')),
  display_name         text NOT NULL,
  address_text         text NOT NULL,
  zone                 text,
  lat                  double precision NOT NULL,
  lng                  double precision NOT NULL,
  hours                text,
  wallet_address       text NOT NULL,
  review_status        text NOT NULL DEFAULT 'APPLIED'
                       CHECK (review_status IN ('APPLIED', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'PAUSED', 'REJECTED', 'SUSPENDED')),
  review_note          text,
  cash_declared_cents  bigint NOT NULL DEFAULT 0,
  cash_reserved_cents  bigint NOT NULL DEFAULT 0,
  max_order_cents      bigint NOT NULL DEFAULT 200000,
  rating               numeric(2, 1),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  -- Nunca se reserva más efectivo del declarado: protege contra vender dos veces la misma liquidez
  CONSTRAINT agents_cash_ck CHECK (cash_reserved_cents >= 0 AND cash_reserved_cents <= cash_declared_cents)
);

CREATE TABLE rate_snapshots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source       text NOT NULL,
  rate_ref_e4  bigint NOT NULL,          -- Bs por USDC × 10⁴
  fetched_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE quotes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_snapshot_id  uuid NOT NULL REFERENCES rate_snapshots (id),
  gross_usdc        bigint NOT NULL,
  rate_ref_e4       bigint NOT NULL,
  margin_bps        int NOT NULL,
  rate_applied_e4   bigint NOT NULL,
  fee_bps           int NOT NULL,
  fee_platform_bps  int NOT NULL,
  fee_usdc          bigint NOT NULL,
  net_usdc          bigint NOT NULL,
  net_bob_cents     bigint NOT NULL,
  expires_at        timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_id         uuid NOT NULL REFERENCES users (id),
  agent_id           uuid NOT NULL REFERENCES agents (id),
  quote_id           uuid NOT NULL UNIQUE REFERENCES quotes (id),
  status             text NOT NULL CHECK (status IN (
                       'AWAITING_PAYMENT', 'PAID_IN_ESCROW', 'IN_HANDOVER', 'SETTLED',
                       'REFUNDED', 'DISPUTED', 'EXPIRED_UNPAID', 'PAYMENT_MISMATCH')),
  tourist_wallet     text NOT NULL,
  agent_wallet       text NOT NULL,
  contract_order_id  text NOT NULL UNIQUE,   -- hex de 32 bytes
  amount_usdc        bigint NOT NULL,
  net_bob_cents      bigint NOT NULL,
  payment_deadline   timestamptz NOT NULL,   -- vence la cotización: después no se acepta el depósito
  expiry             timestamptz NOT NULL,   -- vencimiento on-chain de la orden
  handover_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_status_idx ON orders (status);
CREATE INDEX orders_agent_idx ON orders (agent_id, status);

CREATE TABLE chain_transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid REFERENCES orders (id),
  tx_hash       text NOT NULL UNIQUE,
  kind          text NOT NULL,
  network       text NOT NULL,
  submitted_by  uuid REFERENCES users (id),
  fee_charged   bigint,
  status        text NOT NULL,
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  confirmed_at  timestamptz
);

-- Eventos del contrato ya procesados: la clave es el id del evento en Stellar RPC (idempotencia)
CREATE TABLE chain_events (
  id            text PRIMARY KEY,
  order_id      uuid REFERENCES orders (id),
  contract_order_id text NOT NULL,
  tx_hash       text,
  ledger        int NOT NULL,
  name          text NOT NULL,
  payload       jsonb NOT NULL,
  result        text NOT NULL,
  processed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chain_cursor (
  id      int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  cursor  text,
  start_ledger int
);

CREATE TABLE withdrawals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES orders (id),
  qr_nonce_hash  text NOT NULL,
  pin_hash       text NOT NULL,
  status         text NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'REDEEMED', 'REVOKED')),
  failed_attempts int NOT NULL DEFAULT 0,
  expires_at     timestamptz NOT NULL,
  redeemed_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX withdrawals_one_active ON withdrawals (order_id) WHERE status = 'ISSUED';
CREATE INDEX withdrawals_qr_idx ON withdrawals (qr_nonce_hash);

CREATE TABLE disputes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders (id),
  opened_by   text NOT NULL,             -- dirección Stellar que la abrió
  reason      text,
  status      text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
  resolution  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Movimientos inmutables: nunca se actualizan, solo se agregan
CREATE TABLE ledger_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid REFERENCES orders (id),
  account     text NOT NULL,
  debit       bigint NOT NULL DEFAULT 0,
  credit      bigint NOT NULL DEFAULT 0,
  currency    text NOT NULL CHECK (currency IN ('USDC', 'BOB')),
  reference   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor        text NOT NULL,
  action       text NOT NULL,
  resource_id  text,
  data         jsonb,
  occurred_at  timestamptz NOT NULL DEFAULT now()
);
