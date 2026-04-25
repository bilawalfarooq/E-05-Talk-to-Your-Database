-- Mock banking schema for AI Data Copilot (PostgreSQL / Neon)
-- Seeded on first connect when DATABASE_URL is set.

CREATE TABLE IF NOT EXISTS branches (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  city          TEXT NOT NULL,
  region        TEXT NOT NULL,
  opened_at     TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS atms (
  id            INTEGER PRIMARY KEY,
  branch_id     INTEGER NOT NULL REFERENCES branches(id),
  model         TEXT NOT NULL,
  installed_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS atm_failures (
  id                    SERIAL PRIMARY KEY,
  atm_id                INTEGER NOT NULL REFERENCES atms(id),
  failed_at             TIMESTAMPTZ NOT NULL,
  reason                TEXT NOT NULL,
  resolution_minutes    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  city          TEXT NOT NULL,
  segment       TEXT NOT NULL,
  opened_at     TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id            INTEGER PRIMARY KEY,
  customer_id   INTEGER NOT NULL REFERENCES customers(id),
  type          TEXT NOT NULL,
  balance       DOUBLE PRECISION NOT NULL,
  opened_at     TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id            SERIAL PRIMARY KEY,
  account_id    INTEGER NOT NULL REFERENCES accounts(id),
  amount        DOUBLE PRECISION NOT NULL,
  type          TEXT NOT NULL,
  channel       TEXT NOT NULL,
  occurred_at   TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_products (
  customer_id   INTEGER NOT NULL REFERENCES customers(id),
  product_id    INTEGER NOT NULL REFERENCES products(id),
  opened_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_failures_failed_at ON atm_failures(failed_at);
CREATE INDEX IF NOT EXISTS idx_tx_occurred_at     ON transactions(occurred_at);
CREATE INDEX IF NOT EXISTS idx_tx_account         ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_atms_branch        ON atms(branch_id);
CREATE INDEX IF NOT EXISTS idx_failures_atm       ON atm_failures(atm_id);

CREATE TABLE IF NOT EXISTS app_conversations (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  updated_at BIGINT NOT NULL,
  messages_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  avatar TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS app_sessions (
  token TEXT PRIMARY KEY,
  user_email TEXT NOT NULL REFERENCES app_users(email) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
