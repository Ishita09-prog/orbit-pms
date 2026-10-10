import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { env } from './config/env.js';
import { query } from './db/pool.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createRateLimiters } from './middleware/rateLimiters.js';
import { requestLogger } from './middleware/requestLogger.js';
import { createApiRouter } from './routes/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const openApiDocument = YAML.parse(readFileSync(path.join(here, '..', 'openapi.yaml'), 'utf8'));

/** Builds the Express app. `rateLimits` can be overridden (used by the tests). */
export function createApp({ rateLimits } = {}) {
  const app = express();
  const limiters = createRateLimiters(rateLimits);

  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy); // needed so rate limiting sees the real client IP behind a proxy
  app.use(requestLogger);

  // Swagger UI needs inline scripts, so it is mounted before the strict Helmet headers.
  app.get('/api/openapi.json', (_req, res) => res.json(openApiDocument));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, { customSiteTitle: 'PMS API docs' }));

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Native mobile apps and curl send no Origin header; browsers must be on the allow-list.
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.get('/', (_req, res) =>
    res.json({ name: 'Project Management System API', docs: '/api/docs', health: '/health', version: '1.0.0' }),
  );

  app.get('/health', async (_req, res) => {
    try {
      await query('SELECT 1');
      res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'unreachable' });
    }
  });

  app.use('/api', limiters.api, createApiRouter(limiters));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
