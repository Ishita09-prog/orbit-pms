import { query } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';
import { createParams, escapeLike } from './queryHelpers.js';

// Whitelisted sort columns — user input only ever selects a key, it is never placed in SQL.
const SORT_COLUMNS = {
  createdAt: 'p.created_at',
  name: 'lower(p.name)',
  startDate: 'p.start_date',
  endDate: 'p.end_date',
  status: 'p.status',
};

const SELECT_WITH_COUNTS = `
  SELECT p.id, p.name, p.description, p.status, p.start_date, p.end_date, p.created_at, p.updated_at,
         COUNT(t.id)::int                                        AS task_count,
         (COUNT(t.id) FILTER (WHERE t.status = 'Completed'))::int AS completed_task_count
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id`;

export function toProject(row) {
  const taskCount = row.task_count ?? 0;
  const completed = row.completed_task_count ?? 0;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    taskCount,
    completedTaskCount: completed,
    progress: taskCount === 0 ? 0 : Math.round((completed / taskCount) * 100),
  };
}

export async function listProjects(userId, { search, status, sortBy, order, page, limit }) {
  const params = createParams([userId]);
  const where = ['p.user_id = $1'];
  if (search) where.push(`p.name ILIKE ${params.add(`%${escapeLike(search)}%`)} ESCAPE '\\'`);
  if (status) where.push(`p.status = ${params.add(status)}`);

  const direction = order === 'asc' ? 'ASC' : 'DESC';
  const orderBy = `${SORT_COLUMNS[sortBy]} ${direction} NULLS LAST, p.id`;
  const whereSql = where.join(' AND ');

  const countParams = [...params.values];
  const limitPlaceholder = params.add(limit);
  const offsetPlaceholder = params.add((page - 1) * limit);

  const [{ rows }, { rows: count }] = await Promise.all([
    query(
      `${SELECT_WITH_COUNTS} WHERE ${whereSql} GROUP BY p.id ORDER BY ${orderBy} LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
      params.values,
    ),
    query(`SELECT COUNT(*)::int AS total FROM projects p WHERE ${whereSql}`, countParams),
  ]);
  return { items: rows.map(toProject), total: count[0].total };
}

export async function getProject(userId, id) {
  const { rows } = await query(`${SELECT_WITH_COUNTS} WHERE p.id = $1 AND p.user_id = $2 GROUP BY p.id`, [id, userId]);
  // Same 404 for "does not exist" and "belongs to someone else" — never reveal other users' ids.
  if (!rows[0]) throw AppError.notFound('Project not found');
  return toProject(rows[0]);
}

export async function createProject(userId, data) {
  const { rows } = await query(
    `INSERT INTO projects (user_id, name, description, status, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [userId, data.name, data.description, data.status, data.startDate, data.endDate],
  );
  return getProject(userId, rows[0].id);
}

export async function updateProject(userId, id, patch) {
  const existing = await getProject(userId, id);
  const merged = { ...existing, ...patch };

  // The body schema can only compare dates that are both in the request; check the merged result too.
  if (merged.startDate && merged.endDate && merged.endDate < merged.startDate) {
    throw AppError.validation([{ location: 'body', field: 'endDate', message: 'End date cannot be before the start date' }]);
  }

  await query(
    `UPDATE projects SET name = $3, description = $4, status = $5, start_date = $6, end_date = $7
      WHERE id = $1 AND user_id = $2`,
    [id, userId, merged.name, merged.description, merged.status, merged.startDate, merged.endDate],
  );
  return getProject(userId, id);
}

export async function deleteProject(userId, id) {
  const { rows } = await query('DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id, name', [id, userId]);
  if (!rows[0]) throw AppError.notFound('Project not found');
  return rows[0];
}
