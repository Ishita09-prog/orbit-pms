// Integration tests — they run against a real PostgreSQL database (TEST_DATABASE_URL).
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/pms_test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';

const { createApp } = await import('../src/app.js');
const { migrate } = await import('../src/db/migrate.js');
const { pool, query } = await import('../src/db/pool.js');

let server;
let base;

async function api(method, path, { token, body, headers = {} } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
}

const password = 'Passw0rd123';
let counter = 0;
async function newUser(name = 'Test User') {
  counter += 1;
  const email = `user${counter}-${Date.now()}@example.com`;
  const res = await api('POST', '/api/auth/register', { body: { fullName: name, email, password } });
  assert.equal(res.status, 201);
  return { token: res.body.token, user: res.body.user, email };
}

before(async () => {
  await migrate();
  await query('TRUNCATE users RESTART IDENTITY CASCADE'); // cascades to projects, tasks, tokens and audit logs
  // Generous limits for the main suite; the rate limiter itself is tested separately below.
  const relaxed = { loginMax: 1000, loginWindowMs: 60_000, registerMax: 1000, registerWindowMs: 60_000, apiMax: 10_000, apiWindowMs: 60_000 };
  server = createApp({ rateLimits: relaxed }).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

describe('authentication', () => {
  it('registers a user and never returns the password hash', async () => {
    const res = await api('POST', '/api/auth/register', {
      body: { fullName: '  Ada Lovelace ', email: 'ADA@Example.com', password },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.fullName, 'Ada Lovelace');
    assert.equal(res.body.user.email, 'ada@example.com');
    assert.ok(res.body.token);
    assert.equal(JSON.stringify(res.body).includes('password'), false);
  });

  it('stores passwords hashed with bcrypt, never in plain text', async () => {
    const { rows } = await query("SELECT password_hash FROM users WHERE email = 'ada@example.com'");
    assert.match(rows[0].password_hash, /^\$2[aby]\$/);
    assert.notEqual(rows[0].password_hash, password);
  });

  it('rejects duplicate emails regardless of case', async () => {
    const res = await api('POST', '/api/auth/register', {
      body: { fullName: 'Someone Else', email: 'ada@EXAMPLE.com', password },
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'EMAIL_TAKEN');
  });

  it('validates registration input', async () => {
    const cases = [
      [{}, 3],
      [{ fullName: 'A', email: 'a@b.co', password }, 1],
      [{ fullName: 'Valid Name', email: 'not-an-email', password }, 1],
      [{ fullName: 'Valid Name', email: 'a@b.co', password: 'short1' }, 1],
      [{ fullName: 'Valid Name', email: 'a@b.co', password: 'allletters' }, 1],
      [{ fullName: '   ', email: 'a@b.co', password }, 1],
    ];
    for (const [body, minIssues] of cases) {
      const res = await api('POST', '/api/auth/register', { body });
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
      assert.ok(res.body.error.details.length >= minIssues);
    }
  });

  it('logs in with correct credentials and rejects wrong ones identically', async () => {
    const ok = await api('POST', '/api/auth/login', { body: { email: 'ada@example.com', password } });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.token);

    const wrongPassword = await api('POST', '/api/auth/login', { body: { email: 'ada@example.com', password: 'Wrong1234' } });
    const unknownEmail = await api('POST', '/api/auth/login', { body: { email: 'nobody@example.com', password } });
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.equal(wrongPassword.body.error.message, unknownEmail.body.error.message);
  });

  it('returns the current user from /auth/me', async () => {
    const { token, user } = await newUser();
    const res = await api('GET', '/api/auth/me', { token });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.id, user.id);
  });

  it('protects routes: no token, garbage token and expired token are all 401', async () => {
    assert.equal((await api('GET', '/api/projects')).status, 401);
    const garbage = await api('GET', '/api/projects', { token: 'not.a.jwt' });
    assert.equal(garbage.status, 401);
    assert.equal(garbage.body.error.code, 'INVALID_TOKEN');

    const { user } = await newUser();
    const expired = jwt.sign({}, process.env.JWT_SECRET, { subject: user.id, jwtid: crypto.randomUUID(), expiresIn: -10 });
    const res = await api('GET', '/api/projects', { token: expired });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'TOKEN_EXPIRED');
  });

  it('rejects tokens signed with a different secret', async () => {
    const { user } = await newUser();
    const forged = jwt.sign({}, 'another-secret-another-secret-123456', { subject: user.id, jwtid: crypto.randomUUID() });
    assert.equal((await api('GET', '/api/auth/me', { token: forged })).status, 401);
  });

  it('logout revokes the token', async () => {
    const { token } = await newUser();
    assert.equal((await api('GET', '/api/auth/me', { token })).status, 200);
    assert.equal((await api('POST', '/api/auth/logout', { token })).status, 200);
    const after = await api('GET', '/api/auth/me', { token });
    assert.equal(after.status, 401);
  });
});

describe('projects', () => {
  it('supports the full CRUD lifecycle', async () => {
    const { token } = await newUser();
    const created = await api('POST', '/api/projects', {
      token,
      body: { name: 'Alpha', description: 'First', status: 'In Progress', startDate: '2026-01-01', endDate: '2026-02-01' },
    });
    assert.equal(created.status, 201);
    const id = created.body.data.id;
    assert.equal(created.body.data.status, 'In Progress');
    assert.equal(created.body.data.startDate, '2026-01-01');
    assert.ok(created.body.data.createdAt);

    const fetched = await api('GET', `/api/projects/${id}`, { token });
    assert.equal(fetched.body.data.name, 'Alpha');

    const updated = await api('PUT', `/api/projects/${id}`, { token, body: { name: 'Alpha v2', status: 'Completed' } });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.name, 'Alpha v2');
    assert.equal(updated.body.data.description, 'First');

    const list = await api('GET', '/api/projects', { token });
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.pagination.total, 1);

    assert.equal((await api('DELETE', `/api/projects/${id}`, { token })).status, 204);
    assert.equal((await api('GET', `/api/projects/${id}`, { token })).status, 404);
  });

  it('validates project input (empty name, bad enum, bad dates, reversed dates)', async () => {
    const { token } = await newUser();
    const bad = [
      { name: '' },
      { name: '   ' },
      { name: 'X', status: 'Done' },
      { name: 'X', startDate: '2026-02-31' },
      { name: 'X', startDate: 'tomorrow' },
      { name: 'X', startDate: '' },
      { name: 'X', startDate: '2026-05-10', endDate: '2026-05-01' },
      { description: 'no name' },
    ];
    for (const body of bad) {
      const res = await api('POST', '/api/projects', { token, body });
      assert.equal(res.status, 400, JSON.stringify(body));
    }
  });

  it('rejects an update that makes the stored dates inconsistent', async () => {
    const { token } = await newUser();
    const { body } = await api('POST', '/api/projects', { token, body: { name: 'P', startDate: '2026-03-01', endDate: '2026-03-31' } });
    const res = await api('PUT', `/api/projects/${body.data.id}`, { token, body: { endDate: '2026-02-01' } });
    assert.equal(res.status, 400);
  });

  it('rejects empty updates and malformed ids', async () => {
    const { token } = await newUser();
    const { body } = await api('POST', '/api/projects', { token, body: { name: 'P' } });
    assert.equal((await api('PUT', `/api/projects/${body.data.id}`, { token, body: {} })).status, 400);
    assert.equal((await api('GET', '/api/projects/not-a-uuid', { token })).status, 400);
  });

  it('searches by name and filters by status without being fooled by wildcards', async () => {
    const { token } = await newUser();
    for (const [name, status] of [['Website 100%', 'In Progress'], ['Website beta', 'Completed'], ['Mobile', 'In Progress']]) {
      await api('POST', '/api/projects', { token, body: { name, status } });
    }
    const search = await api('GET', '/api/projects?search=website', { token });
    assert.equal(search.body.data.length, 2);
    const literal = await api('GET', `/api/projects?search=${encodeURIComponent('100%')}`, { token });
    assert.equal(literal.body.data.length, 1);
    const percentOnly = await api('GET', `/api/projects?search=${encodeURIComponent('%')}`, { token });
    assert.equal(percentOnly.body.data.length, 1);
    const status = await api('GET', '/api/projects?status=In%20Progress', { token });
    assert.equal(status.body.data.length, 2);
    const both = await api('GET', '/api/projects?search=web&status=Completed', { token });
    assert.equal(both.body.data.length, 1);
    assert.equal((await api('GET', '/api/projects?status=bogus', { token })).status, 400);
  });

  it('is safe against SQL injection in search and ids', async () => {
    const { token } = await newUser();
    await api('POST', '/api/projects', { token, body: { name: 'Safe' } });
    const inj = await api('GET', `/api/projects?search=${encodeURIComponent("'; DROP TABLE projects; --")}`, { token });
    assert.equal(inj.status, 200);
    assert.equal(inj.body.data.length, 0);
    const still = await api('GET', '/api/projects', { token });
    assert.equal(still.body.data.length, 1);
    assert.equal((await api('GET', `/api/projects/${encodeURIComponent("1' OR '1'='1")}`, { token })).status, 400);
  });

  it('paginates and sorts', async () => {
    const { token } = await newUser();
    for (const name of ['B', 'A', 'C']) await api('POST', '/api/projects', { token, body: { name } });
    const page = await api('GET', '/api/projects?sortBy=name&order=asc&limit=2&page=1', { token });
    assert.deepEqual(page.body.data.map((p) => p.name), ['A', 'B']);
    assert.equal(page.body.pagination.totalPages, 2);
    const next = await api('GET', '/api/projects?sortBy=name&order=asc&limit=2&page=2', { token });
    assert.deepEqual(next.body.data.map((p) => p.name), ['C']);
  });
});

describe('tasks', () => {
  async function setup() {
    const u = await newUser();
    const project = (await api('POST', '/api/projects', { token: u.token, body: { name: 'Home' } })).body.data;
    return { ...u, project };
  }

  it('supports the full CRUD lifecycle and completing a task', async () => {
    const { token, project } = await setup();
    const created = await api('POST', '/api/tasks', {
      token,
      body: { projectId: project.id, name: 'Write tests', description: 'All of them', priority: 'High', dueDate: '2026-12-01' },
    });
    assert.equal(created.status, 201);
    const task = created.body.data;
    assert.equal(task.status, 'Pending');
    assert.equal(task.priority, 'High');
    assert.equal(task.projectName, 'Home');

    const done = await api('PUT', `/api/tasks/${task.id}`, { token, body: { status: 'Completed' } });
    assert.equal(done.body.data.status, 'Completed');
    assert.equal(done.body.data.name, 'Write tests');

    const edited = await api('PUT', `/api/tasks/${task.id}`, { token, body: { name: 'Write more tests', priority: 'Low', dueDate: null } });
    assert.equal(edited.body.data.dueDate, null);

    const underProject = await api('GET', `/api/tasks?projectId=${project.id}`, { token });
    assert.equal(underProject.body.data.length, 1);

    const proj = await api('GET', `/api/projects/${project.id}`, { token });
    assert.equal(proj.body.data.taskCount, 1);
    assert.equal(proj.body.data.progress, 100);

    assert.equal((await api('DELETE', `/api/tasks/${task.id}`, { token })).status, 204);
    assert.equal((await api('GET', `/api/tasks/${task.id}`, { token })).status, 404);
  });

  it('validates task input', async () => {
    const { token, project } = await setup();
    const bad = [
      {},
      { projectId: project.id },
      { projectId: project.id, name: '  ' },
      { projectId: 'nope', name: 'X' },
      { projectId: project.id, name: 'X', priority: 'Urgent' },
      { projectId: project.id, name: 'X', status: 'Done' },
      { projectId: project.id, name: 'X', dueDate: '2026-13-01' },
      { projectId: project.id, name: 'X', dueDate: '' },
    ];
    for (const body of bad) {
      const res = await api('POST', '/api/tasks', { token, body });
      assert.equal(res.status, 400, JSON.stringify(body));
    }
  });

  it('searches and filters by status and priority', async () => {
    const { token, project } = await setup();
    const make = (name, priority, status) => api('POST', '/api/tasks', { token, body: { projectId: project.id, name, priority, status } });
    await make('Fix login bug', 'High', 'In Progress');
    await make('Fix typo', 'Low', 'Pending');
    await make('Write docs', 'High', 'Completed');

    assert.equal((await api('GET', '/api/tasks?search=fix', { token })).body.data.length, 2);
    assert.equal((await api('GET', '/api/tasks?priority=High', { token })).body.data.length, 2);
    assert.equal((await api('GET', '/api/tasks?status=Completed', { token })).body.data.length, 1);
    assert.equal((await api('GET', '/api/tasks?priority=High&status=In%20Progress&search=login', { token })).body.data.length, 1);
    assert.equal((await api('GET', '/api/tasks?priority=Nope', { token })).status, 400);

    const byPriority = await api('GET', '/api/tasks?sortBy=priority&order=desc', { token });
    assert.equal(byPriority.body.data[byPriority.body.data.length - 1].priority, 'Low');
  });

  it('deleting a project deletes its tasks (cascade)', async () => {
    const { token, project } = await setup();
    const t = (await api('POST', '/api/tasks', { token, body: { projectId: project.id, name: 'Gone soon' } })).body.data;
    await api('DELETE', `/api/projects/${project.id}`, { token });
    assert.equal((await api('GET', `/api/tasks/${t.id}`, { token })).status, 404);
  });
});

describe('authorization — users can only reach their own data', () => {
  it('hides, blocks edits to and blocks deletes of another user’s projects and tasks', async () => {
    const owner = await newUser('Owner');
    const intruder = await newUser('Intruder');
    const project = (await api('POST', '/api/projects', { token: owner.token, body: { name: 'Private' } })).body.data;
    const task = (await api('POST', '/api/tasks', { token: owner.token, body: { projectId: project.id, name: 'Secret' } })).body.data;

    // reads
    assert.equal((await api('GET', `/api/projects/${project.id}`, { token: intruder.token })).status, 404);
    assert.equal((await api('GET', `/api/tasks/${task.id}`, { token: intruder.token })).status, 404);
    assert.equal((await api('GET', '/api/projects', { token: intruder.token })).body.data.length, 0);
    assert.equal((await api('GET', '/api/tasks', { token: intruder.token })).body.data.length, 0);
    assert.equal((await api('GET', `/api/tasks?projectId=${project.id}`, { token: intruder.token })).body.data.length, 0);

    // writes
    assert.equal((await api('PUT', `/api/projects/${project.id}`, { token: intruder.token, body: { name: 'Hacked' } })).status, 404);
    assert.equal((await api('PUT', `/api/tasks/${task.id}`, { token: intruder.token, body: { status: 'Completed' } })).status, 404);
    assert.equal((await api('POST', '/api/tasks', { token: intruder.token, body: { projectId: project.id, name: 'Injected' } })).status, 404);
    assert.equal((await api('DELETE', `/api/tasks/${task.id}`, { token: intruder.token })).status, 404);
    assert.equal((await api('DELETE', `/api/projects/${project.id}`, { token: intruder.token })).status, 404);

    // owner's data is untouched
    const still = await api('GET', `/api/projects/${project.id}`, { token: owner.token });
    assert.equal(still.body.data.name, 'Private');
    const stillTask = await api('GET', `/api/tasks/${task.id}`, { token: owner.token });
    assert.equal(stillTask.body.data.status, 'Pending');
  });
});

describe('dashboard', () => {
  it('reports statistics for the authenticated user only', async () => {
    const a = await newUser('User A');
    const b = await newUser('User B');
    const p1 = (await api('POST', '/api/projects', { token: a.token, body: { name: 'P1', status: 'In Progress' } })).body.data;
    await api('POST', '/api/projects', { token: a.token, body: { name: 'P2', status: 'Completed' } });
    const mk = (name, status, extra = {}) => api('POST', '/api/tasks', { token: a.token, body: { projectId: p1.id, name, status, ...extra } });
    await mk('t1', 'Completed');
    await mk('t2', 'Pending', { dueDate: '2000-01-01' });
    await mk('t3', 'Pending');
    await mk('t4', 'In Progress');
    const pb = (await api('POST', '/api/projects', { token: b.token, body: { name: 'B proj', status: 'In Progress' } })).body.data;
    await api('POST', '/api/tasks', { token: b.token, body: { projectId: pb.id, name: 'b-task' } });

    const dash = (await api('GET', '/api/dashboard', { token: a.token })).body.data;
    assert.equal(dash.totalProjects, 2);
    assert.equal(dash.totalTasks, 4);
    assert.equal(dash.completedTasks, 1);
    assert.equal(dash.pendingTasks, 2);
    assert.equal(dash.inProgressTasks, 1);
    assert.equal(dash.projectsInProgress, 1);
    assert.equal(dash.overdueTasks, 1);
    assert.equal(dash.completionRate, 25);

    const empty = (await api('GET', '/api/dashboard', { token: (await newUser()).token })).body.data;
    assert.equal(empty.totalProjects, 0);
    assert.equal(empty.totalTasks, 0);
  });
});

describe('platform hardening', () => {
  it('rate limits repeated failed logins from the same IP', async () => {
    const limited = createApp({ rateLimits: { loginMax: 3, loginWindowMs: 60_000, registerMax: 100, registerWindowMs: 60_000, apiMax: 1000, apiWindowMs: 60_000 } });
    const srv = limited.listen(0);
    const url = `http://127.0.0.1:${srv.address().port}/api/auth/login`;
    const attempt = () => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'x@example.com', password: 'Wrong1234' }) });
    try {
      const statuses = [];
      for (let i = 0; i < 5; i += 1) statuses.push((await attempt()).status);
      assert.deepEqual(statuses, [401, 401, 401, 429, 429]);
      const res = await attempt();
      assert.ok(res.headers.get('retry-after'));
      assert.equal((await res.json()).error.code, 'RATE_LIMITED');
    } finally {
      await new Promise((resolve) => srv.close(resolve));
    }
  });

  it('answers malformed JSON with 400 and unknown routes with 404 JSON', async () => {
    const bad = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' });
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error.code, 'BAD_REQUEST');
    const missing = await api('GET', '/nope');
    assert.equal(missing.status, 404);
  });

  it('sets CORS only for allowed origins and sends security headers', async () => {
    const allowed = await fetch(`${base}/health`, { headers: { Origin: 'http://localhost:5173' } });
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.ok(allowed.headers.get('x-content-type-options'));
    const denied = await fetch(`${base}/health`, { headers: { Origin: 'https://evil.example' } });
    assert.equal(denied.status, 403);
  });

  it('never exposes password hashes anywhere in API responses', async () => {
    const { token } = await newUser();
    const responses = await Promise.all([
      api('GET', '/api/auth/me', { token }),
      api('GET', '/api/dashboard', { token }),
      api('GET', '/api/audit-logs', { token }),
    ]);
    for (const r of responses) assert.equal(JSON.stringify(r.body).toLowerCase().includes('hash'), false);
  });

  it('records an audit trail', async () => {
    const { token } = await newUser();
    await api('POST', '/api/projects', { token, body: { name: 'Audited' } });
    const logs = await api('GET', '/api/audit-logs', { token });
    assert.deepEqual(logs.body.data.map((l) => l.action).sort(), ['CREATE', 'REGISTER']);
  });

  it('serves the OpenAPI document and health check', async () => {
    assert.equal((await api('GET', '/health')).body.status, 'ok');
    const spec = await api('GET', '/api/openapi.json');
    assert.equal(spec.status, 200);
    assert.ok(spec.body.paths['/api/tasks/{id}']);
  });
});
