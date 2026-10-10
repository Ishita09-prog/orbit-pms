import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { query } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';

// A real bcrypt hash of a random value. Compared against when the email is unknown so that
// "unknown email" and "wrong password" take the same time (prevents user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync(randomUUID(), env.bcryptRounds);

export const toPublicUser = (row) => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  createdAt: row.created_at,
});

function issueToken(userId) {
  const jti = randomUUID();
  const token = jwt.sign({}, env.jwtSecret, {
    algorithm: 'HS256',
    subject: userId,
    jwtid: jti,
    expiresIn: env.jwtExpiresIn,
  });
  const { exp } = jwt.decode(token);
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

export async function register({ fullName, email, password }) {
  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
  try {
    const { rows } = await query(
      `INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id, full_name, email, created_at`,
      [fullName, email, passwordHash],
    );
    return { user: toPublicUser(rows[0]), ...issueToken(rows[0].id) };
  } catch (err) {
    if (err.code === '23505') throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
    throw err;
  }
}

export async function login({ email, password }) {
  const { rows } = await query(
    'SELECT id, full_name, email, password_hash, created_at FROM users WHERE lower(email) = $1',
    [email],
  );
  const user = rows[0];
  const valid = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !valid) {
    throw AppError.unauthorized('Incorrect email or password', 'INVALID_CREDENTIALS');
  }
  return { user: toPublicUser(user), ...issueToken(user.id) };
}

/** Revokes the token's id until it would have expired anyway. */
export async function logout({ userId, jti, exp }) {
  await query(
    `INSERT INTO revoked_tokens (jti, user_id, expires_at) VALUES ($1, $2, to_timestamp($3))
     ON CONFLICT (jti) DO NOTHING`,
    [jti, userId, exp],
  );
  // Opportunistic cleanup of rows that can no longer matter.
  await query('DELETE FROM revoked_tokens WHERE expires_at < now()');
}

export async function getProfile(userId) {
  const { rows } = await query('SELECT id, full_name, email, created_at FROM users WHERE id = $1', [userId]);
  if (!rows[0]) throw AppError.notFound('User not found');
  return toPublicUser(rows[0]);
}
