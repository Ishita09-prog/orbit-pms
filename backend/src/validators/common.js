import { z } from 'zod';
import { isValidIsoDate } from '../utils/dates.js';

/** Builds a string schema with friendly "required" / "must be text" messages. */
export const text = (label) =>
  z.string({
    error: (issue) => (issue.input === undefined ? `${label} is required` : `${label} must be text`),
  });

export const uuid = (label = 'id') => z.uuid({ error: `${label} must be a valid UUID` });

export const isoDate = (label) =>
  text(label).refine(isValidIsoDate, { error: `${label} must be a valid date in YYYY-MM-DD format` });

export const idParams = z.object({ id: uuid('id') });

export const enumOf = (label, values) =>
  z.enum(values, { error: `${label} must be one of: ${values.join(', ')}` });

export const pagination = {
  page: z.coerce.number({ error: 'page must be a number' }).int().min(1, 'page must be at least 1').default(1),
  limit: z.coerce
    .number({ error: 'limit must be a number' })
    .int()
    .min(1, 'limit must be at least 1')
    .max(100, 'limit must be at most 100')
    .default(20),
};

export const sortOrder = enumOf('order', ['asc', 'desc']).default('desc');

export const searchTerm = z.string().trim().max(100, 'search must be at most 100 characters').optional();
