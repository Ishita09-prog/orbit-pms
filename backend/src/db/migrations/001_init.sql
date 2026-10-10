-- Project Management System — initial schema (PostgreSQL 13+)

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------- users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     VARCHAR(100) NOT NULL CHECK (char_length(btrim(full_name)) >= 2),
  email         VARCHAR(254) NOT NULL,
  password_hash TEXT         NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- Emails are unique regardless of letter case.
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------- projects
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(120) NOT NULL CHECK (char_length(btrim(name)) >= 1),
  description TEXT         NOT NULL DEFAULT '',
  status      VARCHAR(20)  NOT NULL DEFAULT 'Not Started'
              CHECK (status IN ('Not Started', 'In Progress', 'Completed')),
  start_date  DATE,
  end_date    DATE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT projects_dates_check CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX projects_user_created_idx ON projects (user_id, created_at DESC);
CREATE INDEX projects_user_status_idx  ON projects (user_id, status);
CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------- tasks
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(160) NOT NULL CHECK (char_length(btrim(name)) >= 1),
  description TEXT         NOT NULL DEFAULT '',
  priority    VARCHAR(10)  NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  status      VARCHAR(20)  NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
  due_date    DATE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX tasks_project_idx        ON tasks (project_id);
CREATE INDEX tasks_project_status_idx ON tasks (project_id, status);
CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------- revoked JWTs (logout)
CREATE TABLE revoked_tokens (
  jti        UUID PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX revoked_tokens_expires_idx ON revoked_tokens (expires_at);

-- ------------------------------------------------------------ audit log
CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(40)  NOT NULL,
  entity_type VARCHAR(20)  NOT NULL,
  entity_id   UUID,
  metadata    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  ip_address  VARCHAR(64),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_user_created_idx ON audit_logs (user_id, created_at DESC);
