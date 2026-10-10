import * as projects from '../services/projectService.js';
import { recordAudit } from '../services/auditService.js';
import { paginated } from '../utils/pagination.js';

export async function list(req, res) {
  const q = req.valid.query;
  res.json(paginated(await projects.listProjects(req.user.id, q), q));
}

export async function get(req, res) {
  res.json({ data: await projects.getProject(req.user.id, req.valid.params.id) });
}

export async function create(req, res) {
  const project = await projects.createProject(req.user.id, req.valid.body);
  await recordAudit({ userId: req.user.id, action: 'CREATE', entityType: 'project', entityId: project.id, metadata: { name: project.name }, ip: req.ip });
  res.status(201).json({ data: project });
}

export async function update(req, res) {
  const project = await projects.updateProject(req.user.id, req.valid.params.id, req.valid.body);
  await recordAudit({ userId: req.user.id, action: 'UPDATE', entityType: 'project', entityId: project.id, metadata: { fields: Object.keys(req.valid.body) }, ip: req.ip });
  res.json({ data: project });
}

export async function remove(req, res) {
  const removed = await projects.deleteProject(req.user.id, req.valid.params.id);
  await recordAudit({ userId: req.user.id, action: 'DELETE', entityType: 'project', entityId: removed.id, metadata: { name: removed.name }, ip: req.ip });
  res.status(204).end();
}
