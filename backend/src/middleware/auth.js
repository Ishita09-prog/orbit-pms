import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';

/**
 * Requires `Authorization: Bearer <jwt>`. Rejects expired, tampered, revoked (logged-out)
 * tokens and tokens whose user no longer exists. Sets `req.user` and `req.token`.
 */
export async function authenticate(req, _res, next) {
  try {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw AppError.unauthorized('Authentication required. Please log in.');
    }

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw AppError.unauthorized('Your session has expired. Please log in again.', 'TOKEN_EXPIRED');
      }
      throw AppError.unauthorized('Invalid authentication token. Please log in again.', 'INVALID_TOKEN');
    }

    // One round trip: user must still exist and the token must not have been revoked by logout.
    const { rows } = await query(
      `SELECT u.id, u.full_name, u.email
         FROM users u
        WHERE u.id = $1
          AND NOT EXISTS (SELECT 1 FROM revoked_tokens r WHERE r.jti = $2)`,
      [payload.sub, payload.jti],
    );
    if (rows.length === 0) {
      throw AppError.unauthorized('Your session is no longer valid. Please log in again.', 'INVALID_TOKEN');
    }

    req.user = { id: rows[0].id, fullName: rows[0].full_name, email: rows[0].email };
    req.token = { jti: payload.jti, exp: payload.exp };
    next();
  } catch (err) {
    next(err);
  }
}
