import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

function build({ windowMs, limit, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (_req, _res, next) => next(new AppError(429, 'RATE_LIMITED', message)),
  });
}

/** Factory so tests (and deployments) can supply their own limits. */
export function createRateLimiters(config = env.rateLimit) {
  return {
    // Brute-force protection: only failed attempts count towards the limit.
    login: build({
      windowMs: config.loginWindowMs,
      limit: config.loginMax,
      skipSuccessfulRequests: true,
      message: 'Too many failed login attempts. Please wait a few minutes and try again.',
    }),
    register: build({
      windowMs: config.registerWindowMs,
      limit: config.registerMax,
      message: 'Too many accounts created from this network. Please try again later.',
    }),
    api: build({
      windowMs: config.apiWindowMs,
      limit: config.apiMax,
      message: 'Too many requests. Please slow down.',
    }),
  };
}
