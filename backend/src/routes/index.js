import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParams, pagination } from '../validators/common.js';
import { loginSchema, registerSchema } from '../validators/auth.js';
import { createProjectSchema, listProjectsQuery, updateProjectSchema } from '../validators/project.js';
import { createTaskSchema, listTasksQuery, updateTaskSchema } from '../validators/task.js';
import * as auth from '../controllers/authController.js';
import * as projects from '../controllers/projectController.js';
import * as tasks from '../controllers/taskController.js';
import * as dashboard from '../controllers/dashboardController.js';

export function createApiRouter(limiters) {
  const router = Router();

  // ---- Auth (public: register/login; protected: logout/me)
  router.post('/auth/register', limiters.register, validate({ body: registerSchema }), auth.register);
  router.post('/auth/login', limiters.login, validate({ body: loginSchema }), auth.login);
  router.post('/auth/logout', authenticate, auth.logout);
  router.get('/auth/me', authenticate, auth.me);

  // ---- Everything below requires a valid JWT and only ever touches the caller's own data
  router.use(authenticate);

  router.get('/projects', validate({ query: listProjectsQuery }), projects.list);
  router.post('/projects', validate({ body: createProjectSchema }), projects.create);
  router.get('/projects/:id', validate({ params: idParams }), projects.get);
  router.put('/projects/:id', validate({ params: idParams, body: updateProjectSchema }), projects.update);
  router.delete('/projects/:id', validate({ params: idParams }), projects.remove);

  router.get('/tasks', validate({ query: listTasksQuery }), tasks.list);
  router.post('/tasks', validate({ body: createTaskSchema }), tasks.create);
  router.get('/tasks/:id', validate({ params: idParams }), tasks.get);
  router.put('/tasks/:id', validate({ params: idParams, body: updateTaskSchema }), tasks.update);
  router.delete('/tasks/:id', validate({ params: idParams }), tasks.remove);

  router.get('/dashboard', dashboard.dashboard);
  router.get('/audit-logs', validate({ query: z.object(pagination) }), dashboard.auditLogs);

  return router;
}
