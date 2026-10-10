import { z } from 'zod';
import { enumOf, isoDate, pagination, searchTerm, sortOrder, text } from './common.js';

export const PROJECT_STATUSES = ['Not Started', 'In Progress', 'Completed'];

const baseProject = z.object({
  name: text('Project name').trim().min(1, 'Project name cannot be empty').max(120, 'Project name must be at most 120 characters'),
  description: text('Description').trim().max(5000, 'Description must be at most 5000 characters'),
  status: enumOf('status', PROJECT_STATUSES),
  startDate: isoDate('Start date').nullable(),
  endDate: isoDate('End date').nullable(),
});

const endNotBeforeStart = (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate;
const endNotBeforeStartMessage = { path: ['endDate'], error: 'End date cannot be before the start date' };

export const createProjectSchema = baseProject
  .extend({
    description: baseProject.shape.description.default(''),
    status: baseProject.shape.status.default('Not Started'),
    startDate: baseProject.shape.startDate.default(null),
    endDate: baseProject.shape.endDate.default(null),
  })
  .refine(endNotBeforeStart, endNotBeforeStartMessage);

export const updateProjectSchema = baseProject
  .partial()
  .refine((data) => Object.keys(data).length > 0, { error: 'Provide at least one field to update' })
  .refine(endNotBeforeStart, endNotBeforeStartMessage);

export const listProjectsQuery = z.object({
  search: searchTerm,
  status: enumOf('status', PROJECT_STATUSES).optional(),
  sortBy: enumOf('sortBy', ['createdAt', 'name', 'startDate', 'endDate', 'status']).default('createdAt'),
  order: sortOrder,
  ...pagination,
});
