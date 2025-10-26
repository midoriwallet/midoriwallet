# syntax=docker/dockerfile:1.7
FROM node:bookworm AS build
WORKDIR /work

# Crea ~/.npmrc usando el secret de BuildKit sin “hornear” el token
# - Usamos heredoc de Dockerfile para evitar que el parser interprete las líneas como instrucciones
RUN --mount=type=secret,id=npm_token <<'EOF'
set -euo pipefail
TOKEN="$(cat /run/secrets/npm_token)"
mkdir -p "${HOME}"
cat > "${HOME}/.npmrc" <<NPMRC
registry=https://registry.npmjs.org/
@CoinSpace:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${TOKEN}
always-auth=true
NPMRC
EOF

# Copiamos package*.json primero para cachear npm ci
COPY web/package*.json web/
COPY server/package*.json server/

# Instala dependencias y build de web
RUN cd web && npm ci && npm run build

# Instala dependencias de server (prod)
RUN cd server && npm ci --omit=dev

# Copia el resto del código
COPY . .

# --- Imagen final (runtime) ---
FROM node:bookworm AS runner
WORKDIR /app

# Copia artefactos construidos
COPY --from=build /work /app

# Ajusta si tu server escucha otro puerto
EXPOSE 3000

# Comando de arranque
CMD ["node", "server/index.js"]
