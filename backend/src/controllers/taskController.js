import * as tasks from '../services/taskService.js';
import { recordAudit } from '../services/auditService.js';
import { paginated } from '../utils/pagination.js';

export async function list(req, res) {
  const q = req.valid.query;
  res.json(paginated(await tasks.listTasks(req.user.id, q), q));
}

export async function get(req, res) {
  res.json({ data: await tasks.getTask(req.user.id, req.valid.params.id) });
}

export async function create(req, res) {
  const task = await tasks.createTask(req.user.id, req.valid.body);
  await recordAudit({ userId: req.user.id, action: 'CREATE', entityType: 'task', entityId: task.id, metadata: { name: task.name, projectId: task.projectId }, ip: req.ip });
  res.status(201).json({ data: task });
}

export async function update(req, res) {
  const task = await tasks.updateTask(req.user.id, req.valid.params.id, req.valid.body);
  await recordAudit({ userId: req.user.id, action: 'UPDATE', entityType: 'task', entityId: task.id, metadata: { fields: Object.keys(req.valid.body) }, ip: req.ip });
  res.json({ data: task });
}

export async function remove(req, res) {
  const removed = await tasks.deleteTask(req.user.id, req.valid.params.id);
  await recordAudit({ userId: req.user.id, action: 'DELETE', entityType: 'task', entityId: removed.id, metadata: { name: removed.name }, ip: req.ip });
  res.status(204).end();
}
