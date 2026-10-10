import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/AppError.js';

export function notFoundHandler(req, _res, next) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.path}`));
}

// PostgreSQL error codes we translate into client errors instead of 500s.
const PG_ERRORS = {
  '23505': () => new AppError(409, 'CONFLICT', 'That value already exists'),
  '23503': () => new AppError(400, 'BAD_REFERENCE', 'Referenced record does not exist'),
  '23514': () => new AppError(400, 'VALIDATION_ERROR', 'Value violates a database constraint'),
  '22P02': () => new AppError(400, 'BAD_REQUEST', 'Malformed value in request'),
};

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let error = err;

  if (!(error instanceof AppError)) {
    if (err.type === 'entity.parse.failed') {
      error = AppError.badRequest('Request body is not valid JSON');
    } else if (err.type === 'entity.too.large') {
      error = new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
    } else if (err.code && PG_ERRORS[err.code]) {
      error = PG_ERRORS[err.code]();
    } else if (err.message === 'Not allowed by CORS') {
      error = new AppError(403, 'CORS_FORBIDDEN', 'Origin not allowed');
    }
  }

  if (error instanceof AppError) {
    if (error.status >= 500) logger.error(error.message, { requestId: req.id, stack: err.stack });
    return res.status(error.status).json({
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
      requestId: req.id,
    });
  }

  // Unknown failure: log everything, tell the client nothing sensitive.
  logger.error('Unhandled error', { requestId: req.id, message: err.message, stack: err.stack, path: req.path });
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our side. Please try again.',
      ...(env.isProduction ? {} : { debug: err.message }),
    },
    requestId: req.id,
  });
}
