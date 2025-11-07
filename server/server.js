import { config } from 'dotenv';
config({ path: './.env' });
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

// ---- aquí respetamos SITE_URL en el arranque ----
const port = process.env.PORT || 8080;
// Si quieres limitar la interfaz, exporta HOST en el .env; por defecto 0.0.0.0
const host = process.env.HOST || '0.0.0.0';

const server = app.listen(port, host, () => {
  const display = SITE_URL || `http://localhost:${server.address().port}`;
  console.info(`server listening on ${display}`);
  server.timeout = 30000; // 30 sec
});
