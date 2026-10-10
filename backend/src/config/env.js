import 'dotenv/config';

const toBool = (value, fallback = false) =>
  value === undefined || value === '' ? fallback : ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());

const toInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : 'dev-only-insecure-secret-change-me-0123456789abcdef');
if (isProduction && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set to a random string of at least 32 characters in production.');
}

export const env = Object.freeze({
  nodeEnv,
  isProduction,
  isTest,
  port: toInt(process.env.PORT, 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/pms',
  databaseSsl: toBool(process.env.DATABASE_SSL, false),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: toInt(process.env.BCRYPT_ROUNDS, isTest ? 4 : 12),
  // Comma separated list of allowed browser origins. Native mobile apps send no Origin header.
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
  trustProxy: toInt(process.env.TRUST_PROXY, isProduction ? 1 : 0),
  logLevel: process.env.LOG_LEVEL || (isTest ? 'error' : isProduction ? 'info' : 'debug'),
  rateLimit: Object.freeze({
    loginMax: toInt(process.env.LOGIN_RATE_LIMIT_MAX, 10),
    loginWindowMs: toInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    registerMax: toInt(process.env.REGISTER_RATE_LIMIT_MAX, 10),
    registerWindowMs: toInt(process.env.REGISTER_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000),
    apiMax: toInt(process.env.API_RATE_LIMIT_MAX, 600),
    apiWindowMs: toInt(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  }),
});
