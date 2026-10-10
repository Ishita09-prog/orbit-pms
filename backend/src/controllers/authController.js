import * as authService from '../services/authService.js';
import { recordAudit } from '../services/auditService.js';

export async function register(req, res) {
  const result = await authService.register(req.valid.body);
  await recordAudit({ userId: result.user.id, action: 'REGISTER', entityType: 'user', entityId: result.user.id, ip: req.ip });
  res.status(201).json(result);
}

export async function login(req, res) {
  const result = await authService.login(req.valid.body);
  await recordAudit({ userId: result.user.id, action: 'LOGIN', entityType: 'user', entityId: result.user.id, ip: req.ip });
  res.json(result);
}

export async function logout(req, res) {
  await authService.logout({ userId: req.user.id, jti: req.token.jti, exp: req.token.exp });
  await recordAudit({ userId: req.user.id, action: 'LOGOUT', entityType: 'user', entityId: req.user.id, ip: req.ip });
  res.json({ message: 'Logged out successfully' });
}

export async function me(req, res) {
  res.json({ user: await authService.getProfile(req.user.id) });
}
