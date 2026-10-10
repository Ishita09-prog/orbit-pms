# Orbit - Project Management System

A full-stack project and task manager: **one REST API and one PostgreSQL database shared by a React web app and a React Native (Expo) Android app.** Sign in with the same account on both and everything stays in sync.

| | |
|---|---|
| Web | React 19, Vite, TanStack Query, Framer Motion |
| Mobile | React Native (Expo SDK 57), React Navigation, expo-secure-store |
| Backend | Node 22, Express 5, zod, JWT, bcrypt, winston |
| Database | PostgreSQL 13+ |

> **Live links** (fill in after deploying): Web `https://...` - API `https://...` (docs at `/api/docs`) - Android APK `https://...`
> **Demo account** (after `npm run seed`): `demo@example.com` / `Demo@1234`

## Repository layout

```
backend/   Express API, migrations, seed, tests, OpenAPI spec
web/       React web app
mobile/    Expo / React Native app
docs/      API.md, ER-diagram.md (+ .svg)
.github/   CI workflow
docker-compose.yml, render.yaml
```

## Features

- **Auth** - register, login, logout (the JWT is revoked server-side), `/me`; bcrypt hashing, unique case-insensitive email, rate-limited auth endpoints; expired or revoked sessions return to the login screen with a clear message. The mobile token is kept in the Android Keystore through `expo-secure-store`.
- **Projects** - create, read, update, delete with name, description, status, start/end date, created date; search by name, filter by status, sort, paginate; progress computed from tasks.
- **Tasks** - full CRUD with priority, status, due date, created date; one-tap *mark completed*; search by name, filter by status and priority, sort, paginate.
- **Dashboard** - total projects, total tasks, completed tasks, pending tasks, projects in progress (plus completion rate, overdue, priority and status breakdowns, upcoming and recent tasks).
- **Security** - users only ever see their own data (enforced in SQL), parameterised queries, whitelisted sort columns, zod validation, helmet, CORS allow-list, request IDs and structured logging.
- **Bonus** - Docker and docker-compose, backend integration tests (28) and web unit tests, pagination and sorting, audit log (`GET /api/audit-logs`), GitHub Actions CI, offline viewing of cached data on mobile, optimistic updates, OpenAPI/Swagger docs.

## Quick start (Docker)

```bash
docker compose up --build
# web http://localhost:8080   API http://localhost:4000 (docs: /api/docs)
docker compose exec backend npm run seed     # optional demo data
```

## Local setup

Requirements: Node 20+ (22 recommended), PostgreSQL 13+.

### 1. Database

```bash
createdb pms                      # or: psql -U postgres -c "CREATE DATABASE pms;"
```

The schema (tables, foreign keys, constraints, indexes, triggers) is created automatically when the backend starts. To do it by hand: `cd backend && npm run migrate`. Design notes and the ER diagram: [docs/ER-diagram.md](docs/ER-diagram.md).

### 2. Backend

```bash
cd backend
cp .env.example .env              # then edit DATABASE_URL and JWT_SECRET
npm install
npm run seed                      # optional: demo user + sample projects/tasks
npm run dev                       # http://localhost:4000  (Swagger UI: /api/docs)
npm test                          # integration tests (uses DATABASE_URL / TEST_DATABASE_URL)
```

### 3. Web

```bash
cd web
cp .env.example .env              # VITE_API_URL=http://localhost:4000
npm install
npm run dev                       # http://localhost:5173
npm test && npm run build
```

### 4. Mobile (Android)

```bash
cd mobile
cp .env.example .env              # EXPO_PUBLIC_API_URL=...
npm install
npx expo start                    # scan the QR code with Expo Go, or press "a" for an emulator
```

`EXPO_PUBLIC_API_URL` must be reachable **from the phone**:

| Where the app runs | Value |
|---|---|
| Android emulator, backend on your computer | `http://10.0.2.2:4000` (default) |
| Physical phone on the same Wi-Fi | `http://<your-computer-LAN-IP>:4000` |
| **Deployed backend** | `https://your-api.onrender.com` |

To run the mobile app against the deployed backend: set `EXPO_PUBLIC_API_URL` to the deployed URL (in `mobile/.env`, or `env` in `mobile/eas.json` for cloud builds) and restart with `npx expo start -c`.

## Environment variables

**Backend** (`backend/.env`, see `.env.example`)

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/pms` | PostgreSQL connection string |
| `DATABASE_SSL` | `false` | `true` for managed databases that require TLS |
| `JWT_SECRET` | dev value | **Required in production** (>= 32 chars) |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `CORS_ORIGINS` | localhost origins | Comma-separated list of allowed web origins |
| `PORT` | `4000` | HTTP port |
| `AUTO_MIGRATE` | `true` | Apply migrations on boot |
| `TRUST_PROXY` | `0` (`1` in production) | Reverse-proxy hops, for correct client IPs in rate limiting |
| `BCRYPT_ROUNDS` | `12` | |
| `LOG_LEVEL` | `debug` / `info` | |
| `LOGIN_RATE_LIMIT_MAX` ... `API_RATE_LIMIT_WINDOW_MS` | see `.env.example` | Rate-limit tuning |

**Web** (`web/.env`, build-time): `VITE_API_URL`, optional `VITE_BG_IMAGE`, `VITE_BG_VIDEO`, `VITE_SHOW_DEMO`.
**Mobile** (`mobile/.env`, build-time): `EXPO_PUBLIC_API_URL`.

## API

Summary in [docs/API.md](docs/API.md); full interactive docs at `<API>/api/docs`. Required endpoints: `POST /api/auth/{register,login,logout}`, `GET /api/auth/me`, `/api/projects` (+ `/:id`), `/api/tasks` (+ `/:id`), `GET /api/dashboard`.

## Deployment

1. **Database + API (Render)** - Render dashboard -> *New -> Blueprint* -> select this repo. [`render.yaml`](render.yaml) creates a PostgreSQL database and the API (`JWT_SECRET` is generated). After the first deploy set `CORS_ORIGINS` to your web URL. *(Alternative: Neon/Supabase for the database, `DATABASE_SSL=true`; Railway/Fly for the API.)*
2. **Web (Vercel or Netlify)** - import the repo, root directory `web`, build command `npm run build`, output `dist`, environment variable `VITE_API_URL=<API URL>`. SPA rewrites are preconfigured (`vercel.json`, `netlify.toml`).
3. **Android APK (Expo EAS)**
   ```bash
   cd mobile
   npm i -g eas-cli && eas login
   # put your API URL in eas.json -> build.preview.env.EXPO_PUBLIC_API_URL
   eas build --platform android --profile preview     # returns a download link to the .apk
   ```
   The link can be opened directly on an Android phone.

## Custom background (optional)

The web app has an animated gradient background. To use your own image or video, drop the file into `web/public/media/` and set `VITE_BG_IMAGE=/media/background.jpg` or `VITE_BG_VIDEO=/media/background.mp4` before building.

## Testing

`cd backend && npm test` - 28 integration tests: auth, CRUD, validation, per-user isolation, dashboard, rate limiting, CORS, SQL-injection attempts, audit log.
`cd web && npm test` - validation unit tests. `cd mobile && npm run typecheck`. CI runs all of these on every push ([`ci.yml`](.github/workflows/ci.yml)).
