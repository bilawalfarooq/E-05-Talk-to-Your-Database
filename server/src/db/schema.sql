-- Mock banking schema for AI Data Copilot
-- Read-only by application; seeded once on first boot.

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
  model        TEXT NOT NULL,           -- e.g. 'NCR-X1', 'Diebold-S2', 'Wincor-P3'
  installed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS atm_failures (
  id                  INTEGER PRIMARY KEY,
  atm_id              INTEGER NOT NULL REFERENCES atms(id),
  failed_at           TEXT NOT NULL,    -- ISO timestamp
  reason              TEXT NOT NULL,    -- 'Cash Out', 'Network', 'Hardware', 'Software', 'Power'
  resolution_minutes  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  city         TEXT NOT NULL,
  segment      TEXT NOT NULL,           -- 'Retail', 'Premier', 'SME', 'Corporate'
  opened_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id           INTEGER PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers(id),
  type         TEXT NOT NULL,           -- 'Savings', 'Current', 'Term Deposit', 'Loan'
  balance      REAL NOT NULL,
  opened_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id           INTEGER PRIMARY KEY,
  account_id   INTEGER NOT NULL REFERENCES accounts(id),
  amount       REAL NOT NULL,
  type         TEXT NOT NULL,           -- 'Debit', 'Credit'
  channel      TEXT NOT NULL,           -- 'ATM', 'Branch', 'Online', 'Mobile'
  occurred_at  TEXT NOT NULL,
  status       TEXT NOT NULL            -- 'Success', 'Failed', 'Pending'
);

CREATE TABLE IF NOT EXISTS products (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL            -- 'Card', 'Loan', 'Insurance', 'Investment'
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
