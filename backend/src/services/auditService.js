import { query } from '../db/pool.js';
import { logger } from '../config/logger.js';

/** Records who did what. Failures are logged but never break the user's request. */
export async function recordAudit({ userId, action, entityType, entityId = null, metadata = {}, ip = null }) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [userId, action, entityType, entityId, JSON.stringify(metadata), ip],
    );
  } catch (err) {
    logger.warn('Failed to write audit log', { message: err.message, action });
  }
}

export async function listAudit(userId, { page, limit }) {
  const offset = (page - 1) * limit;
  const [{ rows }, { rows: count }] = await Promise.all([
    query(
      `SELECT id, action, entity_type, entity_id, metadata, created_at
         FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    ),
    query('SELECT COUNT(*)::int AS total FROM audit_logs WHERE user_id = $1', [userId]),
  ]);
  return {
    items: rows.map((r) => ({
      id: Number(r.id),
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      metadata: r.metadata,
      createdAt: r.created_at,
    })),
    total: count[0].total,
  };
}
