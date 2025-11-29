import { config } from 'dotenv';
config({ path: './.env' });

import fs from 'fs';
import http from 'http';
import https from 'https';

import Integrations from '@sentry/integrations';
import Sentry from '@sentry/node';
import express from 'express';
import { isHttpError } from 'http-errors';
import middleware from './middleware.js';

import apiV1 from './lib/v1/api.js';
import apiV2 from './lib/v2/api.js';
import apiV3 from './lib/v3/api.js';
import apiV4 from './lib/v4/api.js';

const app = express();

// Normaliza SITE_URL (sin barra final) para logs/uso posterior
const SITE_URL = process.env.SITE_URL
  ? process.env.SITE_URL.replace(/\/$/, '')
  : undefined;

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  release: `midori.server@${process.env.npm_package_version}`,
  integrations: [
    new Integrations.CaptureConsole({
      levels: ['error'],
    }),
  ],
});
app.use(Sentry.Handlers.requestHandler());

// Si estás detrás de proxy/reverse-proxy (nginx, heroku, etc.)
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

middleware.init(app);

// API routes
app.use('/api/v1', apiV1);
app.use('/api/v2', apiV2);
app.use('/api/v3', apiV3);
app.use('/api/v4', apiV4);
app.set('views', './views');
app.set('view engine', 'ejs');

if (process.env.IS_TOR !== 'true') {
  app.get('/.well-known/webauthn', (req, res) => {
    const origins = [];
    if (process.env.SITE_URL) {
      try { origins.push(new URL(process.env.SITE_URL).origin); } catch { }
    }
    if (process.env.SITE_URL_TOR) {
      try { origins.push(new URL(process.env.SITE_URL_TOR).origin); } catch { }
    }
    return res.json({ origins });
  });
}

app.get('*', (req, res, next) => {
  if (isAssetsPath(req.path)) return next();
  res.sendFile('index.html', { root: './dist/' });
});

function isAssetsPath(path) {
  return path.match(/\/assets\//);
}

app.use(Sentry.Handlers.errorHandler());

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.log(err.stack || err.message || err);
  const status = err.status || 500;

  res.status(status);

  if (isHttpError(err)) {
    res.send({
      error: err.expose === true ? err.message : err.name,
      code: status,
    });
  } else {
    res.send({
      error: 'Oops! something went wrong.',
      code: status,
    });
  }
});

// eslint-disable-next-line no-unused-vars
app.use((req, res, next) => {
  res.status(404).send({ error: 'Oops! page not found.' });
});

/* ===========================
   SSL / HTTP bootstrapping
   =========================== */

// Respeta HOST y PORT para el servidor HTTP “legacy” o para redirección
const host = process.env.HOST || '0.0.0.0';
const httpPort = Number(process.env.PORT || 8080);

// Config SSL desde .env
const SSL_ENABLED = String(process.env.SSL_ENABLED || '').toLowerCase() === 'true';
const SSL_PORT = Number(process.env.SSL_PORT || 8443);
const START_HTTP_REDIRECT = String(process.env.START_HTTP_REDIRECT || 'true').toLowerCase() === 'true';

// Si SSL está activo, fuerza HSTS
if (SSL_ENABLED) {
  app.use((req, res, next) => {
    // 6 meses de HSTS; ajusta si hace falta. Incluye subdominios y preload opcionalmente.
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    next();
  });
}

function buildHttpsOptionsFromEnv() {
  const keyPath = process.env.SSL_KEY_PATH;
  const certPath = process.env.SSL_CERT_PATH;
  const caPath = process.env.SSL_CA_PATH; // opcional
  const passphrase = process.env.SSL_PASSPHRASE; // opcional

  if (!keyPath || !certPath) {
    throw new Error('SSL_KEY_PATH y SSL_CERT_PATH son requeridos cuando SSL_ENABLED=true');
  }

  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  if (caPath) {
    // Soporta cadena intermedia: un archivo con la cadena completa o varios separados por \n
    options.ca = fs.readFileSync(caPath);
  }

  if (passphrase) {
    options.passphrase = passphrase;
  }

  return options;
}

function logListening(protocol, portToUse) {
  const display = SITE_URL
    ? SITE_URL
    : `${protocol}://localhost:${portToUse}`;
  console.info(`server listening on ${display}`);
}

// Modo SSL
if (SSL_ENABLED) {
  let httpsOptions;
  try {
    httpsOptions = buildHttpsOptionsFromEnv();
  } catch (e) {
    console.error(`[SSL] ${e.message}`);
    process.exit(1);
  }

  const httpsServer = https.createServer(httpsOptions, app);

  httpsServer.timeout = 30000; // 30 sec
  httpsServer.listen(SSL_PORT, host, () => {
    logListening('https', SSL_PORT);
  });

  // Opcionalmente arranca HTTP para redirigir a HTTPS
  if (START_HTTP_REDIRECT) {
    const redirectApp = express();

    // Si estás detrás de proxy (e.g. X-Forwarded-Proto), respétalo
    if (process.env.TRUST_PROXY === 'true') {
      redirectApp.set('trust proxy', 1);
    }

    redirectApp.use((req, res) => {
      // Construye URL destino preservando host/path/query
      const hostHeader = req.headers.host
        ? req.headers.host.split(':')[0]
        : 'localhost';

      const portPart = (SSL_PORT === 443) ? '' : `:${SSL_PORT}`;
      const location = `https://${hostHeader}${portPart}${req.originalUrl}`;
      res.redirect(301, location);
    });

    const httpServer = http.createServer(redirectApp);
    httpServer.listen(httpPort, host, () => {
      console.info(`[redirect] http://localhost:${httpPort} → https://localhost:${SSL_PORT}`);
    });
  }
} else {
  // Modo HTTP puro (como lo tenías)
  const server = app.listen(httpPort, host, () => {
    logListening('http', server.address().port);
    server.timeout = 30000; // 30 sec
  });
}
