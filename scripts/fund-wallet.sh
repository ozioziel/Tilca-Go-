#!/usr/bin/env bash
# Envía TUSDC de prueba a una wallet de testnet (por ejemplo, tu cuenta de Freighter).
# Antes, la wallet debe tener XLM de Friendbot y la trustline a TUSDC:
#   Freighter → Manage assets → Add manually → código TUSDC y el emisor que imprime este script.
# Uso: ./scripts/fund-wallet.sh G... [monto en TUSDC, por defecto 200]
set -euo pipefail
DEST="${1:?Falta la dirección G... de la wallet}"
AMOUNT="${2:-200}"
cd /tmp # el CLI lee el .env del directorio actual
ISSUER=$(stellar keys address tilcago-issuer)
echo "Emisor de TUSDC: $ISSUER"
curl -s "https://friendbot.stellar.org/?addr=$DEST" >/dev/null || true
stellar tx new payment --source tilcago-issuer --destination "$DEST" \
  --asset "TUSDC:$ISSUER" --amount "$((AMOUNT * 10000000))" --network testnet >/dev/null \
  && echo "✓ $AMOUNT TUSDC enviados a $DEST" \
  || echo "✗ No se pudo enviar: ¿la wallet ya tiene la trustline a TUSDC:$ISSUER?"
