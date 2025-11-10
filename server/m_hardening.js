// Security hardening middleware for Express
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export function applyHardening(app) {
    app.disable('x-powered-by');
    app.use(helmet());
    app.use(rateLimit({ windowMs: 60_000, max: 200 }));

    app.use((req, res, next) => {
        try {
            decodeURIComponent(req.path);
        } catch (e) {
            return res.status(400).send('Bad Request');
        }
        if (/%25%25|%%|\/cgi-bin\//i.test(req.url) || /%2e%2e/i.test(req.url)) {
            return res.status(403).send('Forbidden');
        }
        next();
    });
}
