# Sitio web de TilcaGo: compila con Vite y lo sirve con Nginx.
# El Nginx del contenedor también reenvía /api/ al contenedor del API (ver docker/nginx.conf).

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
# Ruta relativa: la web y el API comparten dominio, así funciona con cualquier dominio
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
