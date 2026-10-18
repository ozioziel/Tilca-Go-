#!/usr/bin/env bash
# Extiende la vida (TTL) de la instancia y del código del escrow en testnet (~58 días).
# Correrlo después de desplegar o actualizar el contrato, y luego una vez al mes.
# Uso: ./scripts/extend-ttl.sh <ESCROW_CONTRACT_ID>
set -euo pipefail
ESCROW="${1:?Falta el id del contrato}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WASM="$ROOT/contracts/target/wasm32v1-none/release/tilcago_escrow.wasm"
cd /tmp # el CLI lee el .env del directorio actual; se evita mezclar con el de apps/api
stellar contract extend --id "$ESCROW" --ledgers-to-extend 1000000 --durability persistent --source tilcago-admin --network testnet
stellar contract extend --wasm "$WASM" --ledgers-to-extend 1000000 --durability persistent --source tilcago-admin --network testnet
