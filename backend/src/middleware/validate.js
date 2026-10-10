import { AppError } from '../utils/AppError.js';

export function formatZodIssues(error, location) {
  return error.issues.map((issue) => ({
    location,
    field: issue.path.join('.') || undefined,
    message: issue.message,
  }));
}

/**
 * validate({ params, query, body }) — parses each part with its zod schema.
 * Parsed (trimmed / coerced / defaulted) values are exposed on `req.valid`; the raw
 * request data is never used by controllers.
 */
export const validate = (schemas) => (req, _res, next) => {
  const valid = {};
  const issues = [];

  for (const part of ['params', 'query', 'body']) {
    const schema = schemas[part];
    if (!schema) continue;
    const result = schema.safeParse(req[part] ?? {});
    if (result.success) valid[part] = result.data;
    else issues.push(...formatZodIssues(result.error, part));
  }

  if (issues.length > 0) return next(AppError.validation(issues));
  req.valid = valid;
  return next();
};
