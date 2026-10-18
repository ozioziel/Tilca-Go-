# TilcaGo

Turistas con USDC en Stellar retiran **bolivianos en efectivo** con una red de cajeros asociados en Bolivia. El pago queda protegido en un contrato **Soroban** hasta que el turista confirma la entrega en el mostrador. La mascota es el **tilcayo** (*Leopardus tilcayo*), un felino de los Yungas.

> Proyecto de ideathon: todo corre en **Stellar Testnet** con un activo de prueba. No se mueve dinero real.

## Estructura

| Carpeta | Qué es | Stack |
| --- | --- | --- |
| `apps/web` | Prototipo navegable: landing, app del turista y app del cajero | React 19 + Vite |
| `apps/api` | Backend: cotizaciones, cajeros, órdenes, QR/PIN, gas patrocinado y sincronización con la cadena | Node + TypeScript + Fastify + PostgreSQL |
| `contracts/escrow` | Contrato `TilcaGoEscrow` | Rust + soroban-sdk |
| `scripts` | `seed-testnet.sh` prepara testnet desde cero; `extend-ttl.sh` mantiene vivo el contrato | Stellar CLI |

## Cómo funciona (MVP)

1. El turista cotiza: tasa de referencia de mercado − margen, comisión de 1.5 % en USDC. La cotización queda fija 10 minutos.
2. Elige un cajero; el backend **reserva su efectivo** de forma atómica.
3. Firma con su wallet un `deposit` al escrow. **TilcaGo paga la comisión de red** (fee-bump): el turista no necesita XLM.
4. Recibe un código de retiro (QR + PIN de un solo uso).
5. En el mostrador, el cajero valida el código y firma `start_handover`. Desde ahí **el turista ya no puede reembolsarse por su cuenta**.
6. El cajero cuenta el efectivo a la vista, el turista firma `release` y el cajero ve el pago confirmado en Stellar **antes** de entregar los billetes.
7. El contrato paga al cajero (99.50 de 100) y la comisión de TilcaGo (0.50) en la misma transacción.

Si nadie retira, el turista recupera sus USDC con `refund` cuando la orden vence. Si hay un problema durante la entrega, cualquiera de los dos abre una disputa y la resuelve el árbitro: pagar al cajero o reembolsar al turista.

## Requisitos

- Node.js 20 o superior
- Rust con el target `wasm32v1-none` (`rustup target add wasm32v1-none`)
- [Stellar CLI](https://developers.stellar.org/docs/tools/cli) 23 o superior
- Docker (para PostgreSQL), o un PostgreSQL propio

## Puesta en marcha

```bash
# 1. Base de datos
docker compose up -d

# 2. Testnet: cuentas, activo TUSDC, trustlines, SAC y contrato. Genera apps/api/.env y apps/api/.env.demo
./scripts/seed-testnet.sh

# 3. Backend
cd apps/api
npm install
npm run seed        # migraciones + cajeros de demo ligados a las wallets de prueba
npm run dev         # http://localhost:4000

# 4. Flujo completo contra testnet (en otra terminal): deposit → código → start_handover → release
npm run demo

# 5. Prototipo
cd ../web
npm install
npm run dev         # http://localhost:5173
```

Testnet se reinicia cada cierto tiempo: si el API avisa que no encuentra el contrato, vuelve a correr `./scripts/seed-testnet.sh` y `npm run seed`. Para usar un USDC de prueba existente en lugar de TUSDC: `ASSET=USDC:G... ./scripts/seed-testnet.sh`.

## Tests

```bash
cd contracts && cargo test     # 14 tests del escrow, incluido el reembolso bloqueado durante la entrega
cd apps/api && npm test        # montos y validación de transacciones patrocinadas
```

## API (resumen)

| Método y ruta | Quién | Qué hace |
| --- | --- | --- |
| `POST /auth/otp/request`, `POST /auth/otp/verify` | todos | Inicio de sesión por correo + OTP (en demo el código vuelve en la respuesta) |
| `GET /quotes?amount_usdc=100` | público | Cotización con desglose; vence en 10 min |
| `GET /agents?lat=&lng=` | público | Cajeros activos con efectivo disponible |
| `POST /agents/applications` | usuario | Postularse como cajero (queda pendiente de revisión) |
| `PATCH /agents/me/availability` | cajero | Abrir/cerrar el punto y actualizar el efectivo declarado |
| `POST /orders` | turista | Crea la orden y reserva el efectivo |
| `POST /orders/:id/tx/:accion` | turista o cajero | Devuelve la transacción del contrato lista para firmar (`deposit`, `start_handover`, `release`, `refund`, `cancel_handover`, `agent_refund`, `open_dispute`) |
| `POST /tx/submit` | turista o cajero | Recibe la transacción firmada, valida que sea del escrow y la envía con gas patrocinado |
| `POST /orders/:id/withdrawal-code` | turista | Emite el QR + PIN (se guardan solo hashes) |
| `POST /withdrawals/verify` | cajero | Valida y consume el código, una sola vez |
| `GET /admin/agents/pending`, `POST /admin/agents/:id/approve` | admin | Revisión de postulaciones (exige trustline al USDC) |
| `POST /admin/rate` | admin | Carga una nueva tasa de referencia con su fuente |
| `GET /admin/reconciliation` | admin | Totales del libro contable y gas patrocinado |

El estado de las órdenes lo actualiza un proceso que lee los eventos del contrato desde Stellar RPC. Si la base y la cadena difieren, manda la cadena.

## Prototipo (`apps/web`)

| Ruta | Qué es |
| --- | --- |
| `#/` | Landing con calculadora, cómo funciona, Stellar, desglose de la cotización y red de cajeros |
| `#/app` | App del turista: bienvenida, registro, inicio, cotizar, cajeros, pagar, código, entrega en el mostrador, historial y perfil |
| `#/cajero` | App del cajero: inicio, escanear, validar, entrega en curso y ganancias |

Por ahora el prototipo usa datos simulados (`src/data/config.js`); conectarlo al API y a Freighter es la siguiente etapa. Las cifras usan la cotización de ejemplo de la v3: referencia Bs 10.00, margen 0.5 %, comisión 1.5 % → 100 USDC = Bs 980.08.

El diseño de referencia está en Figma (archivo «MOCKUPS», ajustado a la v3).
