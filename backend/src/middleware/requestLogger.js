import { randomUUID } from 'node:crypto';
import { logger } from '../config/logger.js';

/**
 * Assigns a request id (also returned as X-Request-Id) and logs one line per request.
 * Only method, path (no query string), status, duration and user id are logged —
 * never bodies, passwords or tokens.
 */
export function requestLogger(req, res, next) {
  req.id = req.get('x-request-id') || randomUUID();
  res.setHeader('X-Request-Id', req.id);
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger.log(level, `${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${ms.toFixed(1)}ms`, {
      requestId: req.id,
      userId: req.user?.id,
    });
  });
  next();
}
