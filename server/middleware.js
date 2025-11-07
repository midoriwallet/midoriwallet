// middleware.js
import bodyParser from 'body-parser';
import cors from 'cors';
import crypto from 'crypto';
import express from 'express';
import { fileURLToPath } from 'url';
import helmet from 'helmet';

function init(app) {
  // Activa trust proxy ANTES de evaluar HTTPS (importante detrás de proxy/CDN)
  app.set('trust proxy', true);

  // Redirección a HTTPS solo si procede según env
  app.use(requireHTTPS);

  // Helmet "todo en uno" (si necesitas desactivar CSP u otros, ajusta aquí)
  app.use(helmet());
  // Ejemplo si necesitas desactivar CSP:
  // app.use(helmet({ contentSecurityPolicy: false }));

  app.use(cors());

  const dayInMs = 24 * 60 * 60 * 1000;

  app.use(
    bodyParser.urlencoded({
      limit: '2mb',
      extended: true,
    })
  );

  app.use(
    bodyParser.json({
      limit: '2mb',
      verify(req, res, buf) {
        req.bodyHash = req.body
          ? crypto.createHash('sha256').update(buf).digest('hex')
          : '';
      },
    })
  );

  const cacheControl = isProduction()
    ? { maxAge: dayInMs, setHeaders: setCustomCacheControl }
    : null;

  app.use(
    express.static(
      fileURLToPath(new URL('dist', import.meta.url)),
      cacheControl
    )
  );

  app.use(
    '/assets/crypto/',
    express.static(
      fileURLToPath(
        new URL('node_modules/@coinspace/crypto-db/logo', import.meta.url)
      ),
      cacheControl
    )
  );
}

function setCustomCacheControl(res, path) {
  // Evita cachear HTML en producción
  if (express.static.mime.lookup(path) === 'text/html') {
    res.setHeader('Cache-Control', 'public, max-age=0');
  }
}

function wantsHttps() {
  // Forzar HTTPS si:
  // - FORCE_HTTPS=true, o
  // - SITE_URL empieza con https://
  // Si SITE_URL es http://... NO forzamos.
  return (
    process.env.FORCE_HTTPS === 'true' ||
    /^https:\/\//i.test(process.env.SITE_URL || '')
  );
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function requireHTTPS(req, res, next) {
  // No forzar en desarrollo o si el entorno no lo pide
  if (!isProduction() || !wantsHttps()) return next();

  // Detecta si ya llega por HTTPS (útil con proxies)
  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    req.protocol === 'https';

  if (isHttps) return next();

  // Construye destino usando SITE_URL (si válido) para respetar host/puerto
  let origin;
  try {
    if (process.env.SITE_URL) {
      origin = new URL(process.env.SITE_URL).origin; // protocolo + host + puerto (si aplica)
    }
  } catch {
    // SITE_URL inválida → ignoramos y caemos al host de la request
  }

  const fallbackOrigin = `https://${req.get('host')}`;
  const target = (origin || fallbackOrigin) + req.originalUrl;

  // 308: mantiene método/cuerpo (mejor para POST/PUT)
  return res.redirect(308, target);
}

export default {
  init,
};
