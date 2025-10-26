# syntax=docker/dockerfile:1.7
FROM node:20-bookworm AS build
WORKDIR /work

# Prepara .npmrc usando el secret (no queda en la capa final)
# Usamos --mount=type=secret para no “hornear” el token en la imagen
RUN --mount=type=secret,id=npm_token \
    bash -lc 'cat > ~/.npmrc <<EOF
registry=https://registry.npmjs.org/
@CoinSpace:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=$(cat /run/secrets/npm_token)
always-auth=true
EOF'

# Copiamos package.json primero para cachear npm ci
COPY web/package*.json web/
COPY server/package*.json server/

# Instala dependencias y build de web
RUN cd web && npm ci && npm run build

# Instala dependencias de server (prod)
RUN cd server && npm ci --omit=dev

# Copia el resto del código
COPY . .

# --- Imagen final (runtime) ---
FROM node:20-bookworm AS runner
WORKDIR /app

# Copia artefactos construidos
COPY --from=build /work /app

# Ajusta si tu server escucha otro puerto
EXPOSE 3000

# Ajusta el comando de arranque (ejemplos):
# CMD ["node", "server/index.js"]
# o si usas un framework con start script:
# CMD ["npm", "--prefix", "server", "run", "start"]
CMD ["node", "server/index.js"]
