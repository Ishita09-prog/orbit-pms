import { z } from 'zod';
import { enumOf, isoDate, pagination, searchTerm, sortOrder, text, uuid } from './common.js';

export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];
export const TASK_PRIORITIES = ['Low', 'Medium', 'High'];

const baseTask = z.object({
  name: text('Task name').trim().min(1, 'Task name cannot be empty').max(160, 'Task name must be at most 160 characters'),
  description: text('Description').trim().max(5000, 'Description must be at most 5000 characters'),
  priority: enumOf('priority', TASK_PRIORITIES),
  status: enumOf('status', TASK_STATUSES),
  dueDate: isoDate('Due date').nullable(),
});

export const createTaskSchema = baseTask.extend({
  projectId: uuid('projectId'),
  description: baseTask.shape.description.default(''),
  priority: baseTask.shape.priority.default('Medium'),
  status: baseTask.shape.status.default('Pending'),
  dueDate: baseTask.shape.dueDate.default(null),
});

export const updateTaskSchema = baseTask
  .partial()
  .refine((data) => Object.keys(data).length > 0, { error: 'Provide at least one field to update' });

export const listTasksQuery = z.object({
  projectId: uuid('projectId').optional(),
  search: searchTerm,
  status: enumOf('status', TASK_STATUSES).optional(),
  priority: enumOf('priority', TASK_PRIORITIES).optional(),
  sortBy: enumOf('sortBy', ['createdAt', 'dueDate', 'priority', 'name', 'status']).default('createdAt'),
  order: sortOrder,
  ...pagination,
});
