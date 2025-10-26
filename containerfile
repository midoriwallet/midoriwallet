# syntax=docker/dockerfile:1.7
FROM node:20-bookworm AS build
WORKDIR /work

# 1) Copiamos solo manifests para cachear npm ci
COPY web/package*.json web/
COPY server/package*.json server/

# 2) Instalamos dependencias leyendo el token desde el secret
#    (se crea y borra ~/.npmrc en la misma capa)
RUN --mount=type=secret,id=npm_token bash -lc '\
    set -euo pipefail; \
    TOKEN="$(cat /run/secrets/npm_token)"; \
    mkdir -p "$HOME"; \
    printf "%s\n" \
    "registry=https://registry.npmjs.org/" \
    "@CoinSpace:registry=https://npm.pkg.github.com" \
    "//npm.pkg.github.com/:_authToken=$TOKEN" \
    "always-auth=true" > "$HOME/.npmrc"; \
    cd web && npm ci; \
    cd ../server && npm ci --omit=dev; \
    rm -f "$HOME/.npmrc" \
    '

# 3) Ahora sí copiamos el resto del código (incluye phonegap/)
COPY . .

# 4) Construimos la web ya con todas las rutas presentes
RUN cd web && npm run build

# --- Imagen final (runtime) ---
FROM node:20-bookworm AS runner
WORKDIR /app
COPY --from=build /work /app
EXPOSE 3000
CMD ["node", "server/index.js"]
