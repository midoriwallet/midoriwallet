# syntax=docker/dockerfile:1.7
FROM node:bookworm AS build
WORKDIR /work

# Copiamos los package*.json primero para cachear npm ci
COPY web/package*.json web/
COPY server/package*.json server/

# Instala dependencias usando secret de BuildKit y elimina .npmrc en la misma capa
RUN --mount=type=secret,id=npm_token bash -lc '\
    set -euo pipefail; \
    TOKEN="$(cat /run/secrets/npm_token)"; \
    mkdir -p "$HOME"; \
    cat > "$HOME/.npmrc" <<NPMRC
registry=https://registry.npmjs.org/
@CoinSpace:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${TOKEN}
always-auth=true
NPMRC
cd web && npm ci; \
    cd ../server && npm ci --omit=dev; \
    rm -f "$HOME/.npmrc" \
    '

# Ahora sí: copiamos el código fuente y construimos
COPY web/ web/
RUN cd web && npm run build

COPY server/ server/
# (Si tu server necesita transpilar o generar artefactos, hazlo aquí)

# --- Imagen final (runtime) ---
FROM node:bookworm AS runner
WORKDIR /app

# Copiamos artefactos construidos (simple: todo /work)
# Si quieres optimizar tamaño, copia solo lo necesario (p.ej. /work/server y /work/web/dist)
COPY --from=build /work /app

EXPOSE 3000
CMD ["node", "server/index.js"]
