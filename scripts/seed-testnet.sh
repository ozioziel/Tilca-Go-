#!/usr/bin/env bash
# Prepara Stellar Testnet para la demo de TilcaGo desde cero (testnet se reinicia periódicamente).
#
#   1. Crea y fondea con Friendbot las cuentas de la demo.
#   2. Emite el activo de prueba TUSDC (o usa un USDC existente con ASSET=USDC:G...).
#   3. Crea las trustlines y entrega TUSDC a los turistas.
#   4. Despliega el SAC del activo y el contrato TilcaGoEscrow.
#   5. Escribe apps/api/.env (config del backend) y apps/api/.env.demo (claves de prueba).
#
# Uso:  ./scripts/seed-testnet.sh            (desde la raíz del repo)
#       ASSET=USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 ./scripts/seed-testnet.sh
#
# Requiere: stellar CLI (>= 23) y el target wasm32v1-none de Rust.
# Todo es de PRUEBA: ninguna de estas claves debe usarse fuera de testnet.
set -euo pipefail

NETWORK=testnet
PASSPHRASE="Test SDF Network ; September 2015"
RPC_URL="https://soroban-testnet.stellar.org"
P=tilcago                      # prefijo de las identidades en el CLI
FEE_BPS="${FEE_BPS:-50}"       # comisión de TilcaGo: 0.5 %
HANDOVER_WINDOW="${HANDOVER_WINDOW:-1800}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

log() { printf '\n\033[1;33m▸ %s\033[0m\n' "$*"; }

identity() {
  local name="$P-$1"
  if stellar keys address "$name" >/dev/null 2>&1; then
    stellar keys fund "$name" --network "$NETWORK" >/dev/null 2>&1 || true
  else
    stellar keys generate "$name" --network "$NETWORK" --fund >/dev/null
  fi
  stellar keys address "$name"
}

log "Cuentas (Friendbot)"
ADMIN=$(identity admin)
ARBITER=$(identity arbiter)
PLATFORM_FEE=$(identity platform-fee)
GAS_SPONSOR=$(identity gas-sponsor)
TURISTA_1=$(identity turista-1)
TURISTA_2=$(identity turista-2)
CAJERO_1=$(identity cajero-1)
CAJERO_2=$(identity cajero-2)

if [[ -n "${ASSET:-}" ]]; then
  ASSET_CODE="${ASSET%%:*}"
  ASSET_ISSUER="${ASSET##*:}"
  OWN_ASSET=0
  log "Activo existente: $ASSET_CODE emitido por $ASSET_ISSUER"
else
  ISSUER=$(identity issuer)
  ASSET_CODE=TUSDC
  ASSET_ISSUER="$ISSUER"
  OWN_ASSET=1
  log "Activo propio de prueba: TUSDC (no es USDC oficial)"
fi
ASSET_LINE="$ASSET_CODE:$ASSET_ISSUER"

log "Trustlines"
for who in turista-1 turista-2 cajero-1 cajero-2 platform-fee; do
  stellar tx new change-trust --source "$P-$who" --line "$ASSET_LINE" --network "$NETWORK" >/dev/null
  echo "  $who ✓"
done

if [[ "$OWN_ASSET" == 1 ]]; then
  log "Emitiendo 500 TUSDC a cada turista"
  for who in turista-1 turista-2; do
    stellar tx new payment --source "$P-issuer" --destination "$(stellar keys address "$P-$who")" \
      --asset "$ASSET_LINE" --amount 5000000000 --network "$NETWORK" >/dev/null
    echo "  $who ✓"
  done
else
  log "Usa el faucet del emisor para cargar $ASSET_CODE en TURISTA_1 y TURISTA_2"
fi

log "Stellar Asset Contract (SAC) del activo"
stellar contract asset deploy --asset "$ASSET_LINE" --source "$P-admin" --network "$NETWORK" >/dev/null 2>&1 || true
USDC_SAC=$(stellar contract id asset --asset "$ASSET_LINE" --network "$NETWORK")
echo "  $USDC_SAC"

log "Compilando y desplegando TilcaGoEscrow"
(cd "$ROOT/contracts" && stellar contract build >/dev/null)
ESCROW=$(stellar contract deploy \
  --wasm "$ROOT/contracts/target/wasm32v1-none/release/tilcago_escrow.wasm" \
  --source "$P-admin" --network "$NETWORK" -- \
  --admin "$ADMIN" --arbiter "$ARBITER" --token "$USDC_SAC" \
  --fee_account "$PLATFORM_FEE" --fee_bps "$FEE_BPS" --handover_window "$HANDOVER_WINDOW")
echo "  $ESCROW"

log "Extendiendo la vida (TTL) de la instancia y del código"
"$ROOT/scripts/extend-ttl.sh" "$ESCROW" >/dev/null

log "Escribiendo apps/api/.env y apps/api/.env.demo"
mkdir -p "$ROOT/apps/api"
cat > "$ROOT/apps/api/.env" <<EOF
# Generado por scripts/seed-testnet.sh — $(date -u +%Y-%m-%dT%H:%M:%SZ)
PORT=4000
DATABASE_URL=${DATABASE_URL:-postgres://tilcago:tilcago@localhost:5433/tilcago}
STELLAR_RPC_URL=$RPC_URL
STELLAR_NETWORK_PASSPHRASE=$PASSPHRASE
STELLAR_EXPLORER=https://stellar.expert/explorer/testnet
ESCROW_CONTRACT_ID=$ESCROW
USDC_SAC_ID=$USDC_SAC
USDC_ASSET_CODE=$ASSET_CODE
USDC_ASSET_ISSUER=$ASSET_ISSUER
PLATFORM_FEE_ADDRESS=$PLATFORM_FEE
ADMIN_ADDRESS=$ADMIN
GAS_SPONSOR_SECRET=$(stellar keys show "$P-gas-sponsor")
# Tope de comisión que el patrocinador acepta pagar por transacción (stroops de XLM)
GAS_MAX_FEE_STROOPS=2000000
# Faucet de la demo (solo testnet, solo con activo propio): envía TUSDC a las wallets nuevas de la app
FAUCET_ISSUER_SECRET=$([[ "$OWN_ASSET" == 1 ]] && stellar keys show "$P-issuer" || true)
FAUCET_AMOUNT=100

# Cotización de ejemplo de la v3: referencia, margen y comisiones (FEE_BPS_PLATFORM = fee_bps del contrato)
RATE_REF_BOB=10.00
MARGIN_BPS=50
FEE_BPS_TOTAL=150
FEE_BPS_PLATFORM=$FEE_BPS
QUOTE_TTL_MIN=10
ORDER_TTL_MIN=120

# Demo: el OTP se devuelve en la respuesta en vez de enviarse por correo
OTP_DEV=true
ADMIN_EMAILS=admin@tilcago.test
CODE_PEPPER=$(openssl rand -hex 16)
CORS_ORIGIN=http://localhost:5173,https://localhost,capacitor://localhost
EOF
cat > "$ROOT/apps/api/.env.demo" <<EOF
# Claves de PRUEBA para scripts de demo (simulan las wallets del turista y del cajero)
TURISTA_1_SECRET=$(stellar keys show "$P-turista-1")
TURISTA_2_SECRET=$(stellar keys show "$P-turista-2")
CAJERO_1_SECRET=$(stellar keys show "$P-cajero-1")
CAJERO_2_SECRET=$(stellar keys show "$P-cajero-2")
ARBITER_SECRET=$(stellar keys show "$P-arbiter")
EOF

cat <<EOF

✅ Testnet lista
   Escrow        $ESCROW
   Activo        $ASSET_LINE
   SAC           $USDC_SAC
   Turistas      $TURISTA_1  $TURISTA_2
   Cajeros       $CAJERO_1  $CAJERO_2
   Comisión      $PLATFORM_FEE
   Gas sponsor   $GAS_SPONSOR
   Explorador    https://stellar.expert/explorer/testnet/contract/$ESCROW
EOF
