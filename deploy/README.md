# Desplegar TilcaGo en un VPS (Docker + Nginx + Certbot)

Todo corre en Docker. El Nginx del servidor solo reenvía el dominio al contenedor web.

```
Internet ──443──▶ Nginx del servidor (Certbot) ──▶ 127.0.0.1:8080
                                                      │
                                          contenedor web (Nginx)
                                          ├─ /       sitio (build de Vite)
                                          └─ /api/   ──▶ contenedor api (Fastify) ──▶ contenedor db (Postgres)
```

Solo el contenedor web publica un puerto, y únicamente en `127.0.0.1`. El API y la base de datos no son accesibles desde fuera.

## Requisitos del servidor

- Docker con el plugin `compose`
- Nginx y Certbot (los que ya usas)
- Un subdominio apuntando a la IP del VPS, por ejemplo `tilcago.tudominio.com`

## 1. Configuración del API (en tu computadora)

El API necesita `apps/api/.env` y `apps/api/.env.demo`, que genera `./scripts/seed-testnet.sh` (requiere Stellar CLI y Rust). Si ya corriste el seed, cópialos al servidor; **no están en git** porque tienen claves de testnet:

```bash
scp apps/api/.env apps/api/.env.demo usuario@tu-vps:~/Tilca-Go-/apps/api/
```

## 2. En el servidor

```bash
git clone https://github.com/ozioziel/Tilca-Go-.git
cd Tilca-Go-
git checkout feat/app-movil-capacitor        # o la rama que se despliegue

cp deploy/.env.example deploy/.env
nano deploy/.env                             # DOMAIN, POSTGRES_PASSWORD (openssl rand -hex 24) y WEB_PORT

cd deploy
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml --env-file .env exec api npm run seed   # cajeros de demo
docker compose -f docker-compose.prod.yml --env-file .env ps                      # los tres en "healthy"
curl -s http://127.0.0.1:8080/api/health
```

Si el puerto 8080 está ocupado, cambia `WEB_PORT` en `deploy/.env` y en el bloque de Nginx.

## 3. Nginx + Certbot

```bash
sudo cp nginx/tilcago.conf /etc/nginx/sites-available/tilcago
sudo nano /etc/nginx/sites-available/tilcago          # tu dominio en server_name
sudo ln -s /etc/nginx/sites-available/tilcago /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d tilcago.tudominio.com
```

Listo: `https://tilcago.tudominio.com` (landing), `/#/app` (turista) y `/#/cajero` (cajero).

## Actualizar

```bash
cd Tilca-Go-
git pull
cd deploy && docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Las migraciones de la base se aplican solas al arrancar el API. Los datos quedan en el volumen `tilcago_db-data`.

## Cuando testnet se reinicia

Corre otra vez `./scripts/seed-testnet.sh` en tu computadora, copia el nuevo `apps/api/.env` y `.env.demo` al servidor y reinicia:

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --force-recreate api
docker compose -f docker-compose.prod.yml --env-file .env exec api npm run seed
```

## App móvil apuntando al VPS

En GitHub: *Settings → Secrets and variables → Actions → Variables* → `VITE_API_URL = https://tilcago.tudominio.com/api`. Desde el siguiente push, el APK de Actions usa tu servidor y funciona en cualquier celular.

## Comandos útiles

```bash
docker compose -f docker-compose.prod.yml --env-file .env logs -f api     # logs del API
docker compose -f docker-compose.prod.yml --env-file .env restart api
docker compose -f docker-compose.prod.yml --env-file .env exec db psql -U tilcago
```
