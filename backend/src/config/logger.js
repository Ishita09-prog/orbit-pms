import winston from 'winston';
import { env } from './env.js';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} ${level} ${stack || message}${rest}`;
  }),
);

export const logger = winston.createLogger({
  level: env.logLevel,
  format: env.isProduction ? combine(timestamp(), errors({ stack: true }), json()) : devFormat,
  transports: [new winston.transports.Console()],
  silent: env.isTest && !process.env.LOG_LEVEL,
});
