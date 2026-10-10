import { query } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';
import { createParams, escapeLike } from './queryHelpers.js';

const PRIORITY_RANK = `CASE t.priority WHEN 'High' THEN 3 WHEN 'Medium' THEN 2 ELSE 1 END`;

const SORT_COLUMNS = {
  createdAt: 't.created_at',
  dueDate: 't.due_date',
  priority: PRIORITY_RANK,
  name: 'lower(t.name)',
  status: 't.status',
};

// Tasks have no owner column of their own: ownership always flows through the parent project,
// so every query joins projects and filters on p.user_id.
const SELECT_TASK = `
  SELECT t.id, t.project_id, p.name AS project_name, t.name, t.description, t.priority, t.status,
         t.due_date, t.created_at, t.updated_at
    FROM tasks t
    JOIN projects p ON p.id = t.project_id`;

export const toTask = (row) => ({
  id: row.id,
  projectId: row.project_id,
  projectName: row.project_name,
  name: row.name,
  description: row.description,
  priority: row.priority,
  status: row.status,
  dueDate: row.due_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function listTasks(userId, { projectId, search, status, priority, sortBy, order, page, limit }) {
  const params = createParams([userId]);
  const where = ['p.user_id = $1'];
  if (projectId) where.push(`t.project_id = ${params.add(projectId)}`);
  if (search) where.push(`t.name ILIKE ${params.add(`%${escapeLike(search)}%`)} ESCAPE '\\'`);
  if (status) where.push(`t.status = ${params.add(status)}`);
  if (priority) where.push(`t.priority = ${params.add(priority)}`);

  const direction = order === 'asc' ? 'ASC' : 'DESC';
  const orderBy = `${SORT_COLUMNS[sortBy]} ${direction} NULLS LAST, t.id`;
  const whereSql = where.join(' AND ');

  const countParams = [...params.values];
  const limitPlaceholder = params.add(limit);
  const offsetPlaceholder = params.add((page - 1) * limit);

  const [{ rows }, { rows: count }] = await Promise.all([
    query(`${SELECT_TASK} WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`, params.values),
    query(`SELECT COUNT(*)::int AS total FROM tasks t JOIN projects p ON p.id = t.project_id WHERE ${whereSql}`, countParams),
  ]);
  return { items: rows.map(toTask), total: count[0].total };
}

export async function getTask(userId, id) {
  const { rows } = await query(`${SELECT_TASK} WHERE t.id = $1 AND p.user_id = $2`, [id, userId]);
  if (!rows[0]) throw AppError.notFound('Task not found');
  return toTask(rows[0]);
}

export async function createTask(userId, data) {
  // The target project must belong to the caller; otherwise behave as if it does not exist.
  const { rows: owned } = await query('SELECT 1 FROM projects WHERE id = $1 AND user_id = $2', [data.projectId, userId]);
  if (owned.length === 0) throw AppError.notFound('Project not found');

  const { rows } = await query(
    `INSERT INTO tasks (project_id, name, description, priority, status, due_date)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [data.projectId, data.name, data.description, data.priority, data.status, data.dueDate],
  );
  return getTask(userId, rows[0].id);
}

export async function updateTask(userId, id, patch) {
  const existing = await getTask(userId, id);
  const merged = { ...existing, ...patch };
  await query(
    `UPDATE tasks t SET name = $3, description = $4, priority = $5, status = $6, due_date = $7
       FROM projects p
      WHERE t.id = $1 AND p.id = t.project_id AND p.user_id = $2`,
    [id, userId, merged.name, merged.description, merged.priority, merged.status, merged.dueDate],
  );
  return getTask(userId, id);
}

export async function deleteTask(userId, id) {
  const { rows } = await query(
    `DELETE FROM tasks t USING projects p
      WHERE t.id = $1 AND p.id = t.project_id AND p.user_id = $2
  RETURNING t.id, t.name, t.project_id`,
    [id, userId],
  );
  if (!rows[0]) throw AppError.notFound('Task not found');
  return rows[0];
}
