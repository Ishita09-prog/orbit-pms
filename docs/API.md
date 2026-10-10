# API reference

Interactive documentation (Swagger UI) is served by the backend at **`/api/docs`**; the raw OpenAPI 3 spec is [`backend/openapi.yaml`](../backend/openapi.yaml).

- Base URL: `http://localhost:4000` locally, your deployed URL in production.
- Content type: JSON. Authenticated routes need `Authorization: Bearer <token>`.
- Health check: `GET /health`.

## Conventions

| | |
|---|---|
| Success (single) | `{ "data": { ... } }` |
| Success (list) | `{ "data": [ ... ], "pagination": { "page", "limit", "total", "totalPages" } }` |
| Error | `{ "error": { "code", "message", "details?": [{ "field", "message" }] }, "requestId" }` |
| Dates | `YYYY-MM-DD` for project/task dates, ISO-8601 for timestamps |
| IDs | UUID |

Error codes: `VALIDATION_ERROR` (400/422), `UNAUTHORIZED`, `INVALID_TOKEN`, `TOKEN_EXPIRED` (401), `NOT_FOUND` (404 - also returned for resources owned by someone else), `CONFLICT` / `EMAIL_TAKEN` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500). Every response carries an `X-Request-Id` header that is also written to the server log.

## Auth

| Method & path | Body | Response |
|---|---|---|
| `POST /api/auth/register` | `{ fullName, email, password }` (password >= 8 chars, a letter and a number) | `201 { user, token, expiresAt }` |
| `POST /api/auth/login` | `{ email, password }` | `200 { user, token, expiresAt }` |
| `POST /api/auth/logout` | - | `200 { message }`; the token's `jti` is revoked server-side |
| `GET /api/auth/me` | - | `200 { user }` |

Passwords are hashed with bcrypt (12 rounds). Tokens are HS256 JWTs (default 7 days). Login and register are rate limited (10 failed logins / 15 min per IP, 10 registrations / hour per IP).

## Projects

| Method & path | Notes |
|---|---|
| `GET /api/projects` | Query: `search` (name), `status`, `sortBy` (`createdAt` `name` `startDate` `endDate` `status`), `order` (`asc` `desc`), `page`, `limit` (max 100) |
| `POST /api/projects` | `{ name, description?, status?, startDate?, endDate? }` -> `201 { data }` |
| `GET /api/projects/:id` | |
| `PUT /api/projects/:id` | Any subset of the create fields |
| `DELETE /api/projects/:id` | `204`; deletes the project's tasks too |

A project is returned as `{ id, name, description, status, startDate, endDate, createdAt, updatedAt, taskCount, completedTaskCount, progress }`.

## Tasks

| Method & path | Notes |
|---|---|
| `GET /api/tasks` | Query: `projectId`, `search` (name), `status`, `priority`, `sortBy` (`createdAt` `dueDate` `priority` `name` `status`), `order`, `page`, `limit` |
| `POST /api/tasks` | `{ projectId, name, description?, priority?, status?, dueDate? }` -> `201 { data }` |
| `GET /api/tasks/:id` | |
| `PUT /api/tasks/:id` | Any subset of `{ name, description, priority, status, dueDate }`. Mark complete with `{ "status": "Completed" }` |
| `DELETE /api/tasks/:id` | `204` |

Status: `Pending` / `In Progress` / `Completed`. Priority: `Low` / `Medium` / `High`.

## Dashboard and audit log

`GET /api/dashboard` ->

```json
{ "data": {
  "totalProjects": 4, "totalTasks": 12, "completedTasks": 4, "pendingTasks": 4, "projectsInProgress": 2,
  "inProgressTasks": 4, "overdueTasks": 1, "completionRate": 33,
  "projectsByStatus": { "Not Started": 1, "In Progress": 2, "Completed": 1 },
  "openTasksByPriority": { "Low": 2, "Medium": 3, "High": 3 },
  "upcomingTasks": [], "recentTasks": [] } }
```

`GET /api/audit-logs?page=&limit=` returns the signed-in user's own activity history (logins, creates, updates, deletes).

## Security notes

- Every query is parameterised; sort columns are whitelisted; `LIKE` wildcards in search terms are escaped.
- Authorisation is enforced in SQL: projects by `user_id`, tasks through their parent project. Another user's resource is indistinguishable from a missing one (`404`).
- Input is validated with zod on every route; unknown fields are stripped. Bodies are limited to 100 kB.
- helmet security headers, CORS allow-list (`CORS_ORIGINS`), request logging with request IDs (winston).
