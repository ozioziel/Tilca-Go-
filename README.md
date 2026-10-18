# TilcaGo

Turistas con USDC en Stellar retiran **bolivianos en efectivo** con una red de cajeros asociados en Bolivia. El pago queda protegido en un contrato **Soroban** hasta que el turista confirma la entrega en el mostrador. La mascota es el **tilcayo** (*Leopardus tilcayo*), un felino de los Yungas.

> Proyecto de ideathon: todo corre en **Stellar Testnet** con un activo de prueba. No se mueve dinero real.

## Estructura

| Carpeta | Qué es | Stack |
| --- | --- | --- |
| `apps/web` | Landing, app del turista y app del cajero, conectadas al API y a Freighter | React 19 + Vite + Freighter |
| `apps/api` | Backend: cotizaciones, cajeros, órdenes, QR/PIN, gas patrocinado y sincronización con la cadena | Node + TypeScript + Fastify + PostgreSQL |
| `contracts/escrow` | Contrato `TilcaGoEscrow` | Rust + soroban-sdk |
| `scripts` | `seed-testnet.sh` prepara testnet desde cero; `extend-ttl.sh` mantiene vivo el contrato; `fund-wallet.sh` envía TUSDC de prueba | Stellar CLI |

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

# 5. Frontend (usa VITE_API_URL, por defecto http://localhost:4000)
cd ../web
npm install
npm run dev         # http://localhost:5173
```

### Probar con Freighter

1. Instala [Freighter](https://www.freighter.app/) y cámbiala a **Testnet**.
2. Usa una cuenta de prueba. Hay dos formas:
   - **Importar las cuentas del seed** (lo más rápido): en Freighter, *Import wallet* con las claves de `apps/api/.env.demo`. `TURISTA_1_SECRET` es un turista con 500 TUSDC y `CAJERO_1_SECRET` es la cajera de «Sagárnaga Cambios». Son claves de testnet: no las uses para nada más.
   - **Tu propia cuenta**: en Freighter agrega el activo `TUSDC` con el emisor que muestra el seed y luego corre `./scripts/fund-wallet.sh <tu dirección G...>`.
3. App del turista (`#/app`): entra con cualquier correo; en modo demo el código aparece en pantalla.
4. App del cajero (`#/cajero`): entra con `rosa@tilcago.test`. Freighter debe tener la cuenta de `CAJERO_1_SECRET`, la registrada para ese punto.

Para probar los dos lados en la misma computadora, abre cada app en un perfil distinto del navegador, cada uno con su Freighter y su cuenta.

Testnet se reinicia cada cierto tiempo: si el API avisa que no encuentra el contrato, vuelve a correr `./scripts/seed-testnet.sh` y `npm run seed`. Para usar un USDC de prueba existente en lugar de TUSDC: `ASSET=USDC:G... ./scripts/seed-testnet.sh`.

## Despliegue en un VPS

`deploy/` tiene todo para producción con Docker: base de datos, API y web (con su propio Nginx, que también reenvía `/api/`). Solo se publica `127.0.0.1:8080`; el Nginx del servidor y Certbot ponen el dominio y el HTTPS. Pasos en [deploy/README.md](deploy/README.md).

## App móvil (Android e iOS)

La misma app de React se empaqueta como app nativa con [Capacitor](https://capacitorjs.com) (`apps/web/android` y `apps/web/ios`). En el celular abre directo la app del turista; desde la bienvenida se pasa a TilcaGo Partners (cajero).

- **Wallet en el celular:** como Freighter es una extensión de escritorio, la app crea (o importa) una **wallet de prueba de testnet guardada en el dispositivo** y firma ahí mismo. Con el faucet de la demo (`POST /dev/faucet`, activo si el API tiene `FAUCET_ISSUER_SECRET`) recibe 100 TUSDC desde la pantalla de wallet. Es solo para testnet.
- **Escáner del cajero:** usa el escáner de Google (ML Kit) en Android, sin pedir permiso de cámara.
- **Botón atrás de Android:** vuelve una pantalla; en la primera, cierra la app.

```bash
cd apps/web
npm run build:movil         # compila con .env.movil y copia la web a los proyectos nativos
npx cap open android        # abre Android Studio → Run
npm run android             # o compila e instala directo en el emulador/celular conectado
npm run ios                 # simulador de iOS (requiere Xcode)
```

- La URL del API vista desde el celular se define en `apps/web/.env.movil`: `http://10.0.2.2:4000` en el emulador de Android, `http://localhost:4000` en el simulador de iOS. En un celular real hace falta el API publicado con HTTPS.
- Android Studio trae JDK 25: el proyecto usa Gradle 9.1, que lo soporta. Desde la terminal: `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleDebug` dentro de `apps/web/android` genera `app/build/outputs/apk/debug/app-debug.apk`, que se puede instalar en cualquier Android.
- **GitHub Actions** (`.github/workflows/android.yml`): en cada push y pull request compila el APK y lo deja en la pestaña *Actions* como artefacto descargable por 14 días. La URL del API que va dentro del APK se configura en la variable del repositorio `VITE_API_URL` (*Settings → Secrets and variables → Actions → Variables*); sin ella usa la del emulador.
- Ícono y splash del tilcayo: fuentes en `apps/web/assets`; se regeneran con `npx capacitor-assets generate`.

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

## Frontend (`apps/web`)

| Ruta | Qué es |
| --- | --- |
| `#/` | Landing con calculadora, cómo funciona, Stellar, desglose de la cotización y red de cajeros |
| `#/app` | App del turista: bienvenida, registro, inicio, cotizar, cajeros, pagar, código, entrega en el mostrador, historial y perfil |
| `#/cajero` | App del cajero: inicio, escanear, validar, entrega en curso y ganancias |

Las apps usan datos reales del API: tasa, cajeros, órdenes, código QR/PIN y estados de la cadena. Las firmas pasan por Freighter y la comisión de red la paga TilcaGo. Si el API no responde, la landing y el cotizador muestran la cotización de ejemplo de la v3: referencia Bs 10.00, margen 0.5 %, comisión 1.5 % → 100 USDC = Bs 980.08.

| App | Pantallas |
| --- | --- |
| Turista | Bienvenida, acceso por correo + código, wallet (Freighter, red, trustline y saldo), inicio, cotizar, cajeros (mapa real), pagar, código QR + PIN, entrega en el mostrador, historial y perfil |
| Cajero | Acceso, inicio con efectivo declarado/reservado, escanear (cámara con BarcodeDetector o código a mano), validar, entrega en curso, órdenes, ganancias y perfil |

El diseño de referencia está en Figma (archivo «MOCKUPS», ajustado a la v3).
