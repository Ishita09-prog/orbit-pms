import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

// Return DATE columns as plain 'YYYY-MM-DD' strings so time zones can never shift a date.
pg.types.setTypeParser(1082, (value) => value);

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => logger.error('Unexpected PostgreSQL pool error', { message: err.message }));

/** Always call with parameter placeholders ($1, $2, ...) — never interpolate user input. */
export const query = (text, params) => pool.query(text, params);

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
