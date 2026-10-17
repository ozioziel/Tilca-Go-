# TilcaGo · Prototipo en React

Prototipo navegable de **TilcaGo**: los turistas pagan en digital (USDC en Stellar, USDT, BTC o tarjeta) y retiran bolivianos en efectivo con cajeros asociados en Bolivia. La mascota es el **tilcayo** (*Leopardus tilcayo*), un felino de los Yungas.

Incluye tres vistas:

| Ruta | Qué es |
| --- | --- |
| `#/` | Sitio web (landing) con calculadora, cómo funciona, Stellar, comisiones y red de cajeros |
| `#/app` | App del turista: bienvenida, registro, inicio, cotizar, elegir cajero, pagar, código de retiro, historial y perfil |
| `#/cajero` | App del cajero: inicio, escanear código, validar entrega y ganancias |

En computadora, las apps se muestran dentro de un celular con accesos para cambiar de vista. En el celular ocupan toda la pantalla.

## Cómo correrlo

Necesitas [Node.js](https://nodejs.org) 20 o superior.

```bash
npm install
npm run dev
```

Abre la dirección que aparece en la terminal (normalmente `http://localhost:5173`). Para verlo en tu celular, conéctalo a la misma red Wi-Fi y abre la dirección «Network» que muestra Vite.

Para generar la versión de producción:

```bash
npm run build
```

## Animaciones

- **Entrada:** al entrar a la app, el tilcayo trepa por los botones de Inicio y termina echado arriba a la izquierda, como logo. Se salta tocando la pantalla.
- **Cambio de pantalla:** el tilcayo aparece con un celular, lo desliza y entra la pantalla nueva. «Atrás» vuelve directo para no frenar la navegación.
- **Movimiento constante:** tarjetas flotando, nubes, pines del mapa, halo y destello en los botones principales.
- **QR:** un láser escanea el código y aparece «¡Listo!». En la app del cajero, después pasa sola a validar la entrega.
- Si el sistema tiene activado «reducir movimiento», las animaciones se desactivan.

## Estructura

```
src/
  data/config.js        Tasa, comisión, cajeros, movimientos (datos del prototipo)
  i18n.jsx              Textos en español e inglés
  components/           Tilcayo, paisaje, botones, QR, mapa, navegación y transiciones
  screens/turista/      Pantallas de la app del turista
  screens/cajero/       Pantallas de la app del cajero
  screens/web/          Landing
  styles/               Tokens de diseño, vidrio, animaciones y estilos por vista
```

Para cambiar la tasa (1 USD = 6.96 Bs) o la comisión (1.5 %), edita `src/data/config.js`.

## Qué está simulado

Los pagos, el escaneo del QR, la red Stellar, el registro y la verificación de pasaporte son simulados: no se mueve dinero real ni se guardan datos. Las cifras son referenciales. El reparto de la comisión entre TilcaGo y el cajero todavía está por definir; la app del cajero usa un ejemplo de 1 %.

El diseño de referencia está en Figma (archivo «TilcaGo — Web + Mobile Mockups», versión v2).
"# Tilca-Go-" 
