# API de TilcaGo (Fastify + TypeScript). Aplica las migraciones al arrancar.
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
# tsx ejecuta TypeScript directamente; por eso se instalan también las dependencias de desarrollo
RUN npm ci --include=dev && npm cache clean --force

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4000/health >/dev/null || exit 1

CMD ["npx", "tsx", "src/server.ts"]
