-- Mock banking schema for AI Data Copilot (SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS branches (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  city         TEXT NOT NULL,
  region       TEXT NOT NULL,
  opened_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS atms (
  id           INTEGER PRIMARY KEY,
  branch_id    INTEGER NOT NULL REFERENCES branches(id),
  model        TEXT NOT NULL,
  installed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS atm_failures (
  id                  INTEGER PRIMARY KEY,
  atm_id              INTEGER NOT NULL REFERENCES atms(id),
  failed_at           TEXT NOT NULL,
  reason              TEXT NOT NULL,
  resolution_minutes  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  city         TEXT NOT NULL,
  segment      TEXT NOT NULL,
  opened_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id           INTEGER PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers(id),
  type         TEXT NOT NULL,
  balance      REAL NOT NULL,
  opened_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id           INTEGER PRIMARY KEY,
  account_id   INTEGER NOT NULL REFERENCES accounts(id),
  amount       REAL NOT NULL,
  type         TEXT NOT NULL,
  channel      TEXT NOT NULL,
  occurred_at  TEXT NOT NULL,
  status       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_products (
  customer_id  INTEGER NOT NULL REFERENCES customers(id),
  product_id   INTEGER NOT NULL REFERENCES products(id),
  opened_at    TEXT NOT NULL,
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
  updated_at INTEGER NOT NULL,
  messages_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  avatar TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS app_sessions (
  token TEXT PRIMARY KEY,
  user_email TEXT NOT NULL REFERENCES app_users(email) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
