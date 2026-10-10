import { getDashboard } from '../services/dashboardService.js';
import { listAudit } from '../services/auditService.js';
import { paginated } from '../utils/pagination.js';

export async function dashboard(req, res) {
  res.json({ data: await getDashboard(req.user.id) });
}

export async function auditLogs(req, res) {
  const q = req.valid.query;
  res.json(paginated(await listAudit(req.user.id, q), q));
}
