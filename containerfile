FROM docker.io/node:20-alpine AS build
WORKDIR /work

# 1) Copiamos solo manifests para cachear npm ci
COPY web/package*.json web/
COPY server/package*.json server/

# 2) Instalamos dependencias leyendo el token desde el secret
#    (se crea y borra ~/.npmrc en la misma capa)
RUN --mount=type=secret,id=npm_token sh -lc '\
    set -euo pipefail; \
    TOKEN="$(cat /run/secrets/npm_token)"; \
    mkdir -p "$HOME"; \
    printf "%s\n" \
    "registry=https://registry.npmjs.org/" \
    "@CoinSpace:registry=https://npm.pkg.github.com" \
    "//npm.pkg.github.com/:_authToken=$TOKEN" \
    "always-auth=true" > "$HOME/.npmrc"; \
    cd web && npm ci; \
    cd ../server && npm ci; \
    rm -f "$HOME/.npmrc" \
    '
# 3) Ahora sí copiamos el resto del código (incluye phonegap/)
COPY . .

# 4) Construimos la web ya con todas las rutas presentes
RUN sh -lc '\
    cd web; \
    export NODE_OPTIONS="--max-old-space-size=4096"; \
    npm run build'

# --- Imagen final (runtime) ---
FROM docker.io/node:alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /work/server /app
COPY --from=build /work/server/node_modules /app/node_modules

EXPOSE 8081
CMD ["npm", "run", "server"]
