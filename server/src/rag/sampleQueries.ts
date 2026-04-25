import { isPostgres } from "../db/dialect.js";

export interface SampleQuery {
  question: string;
  sql: string;
  /** PostgreSQL / Neon — used when `DATABASE_URL` is set. */
  sqlPostgres?: string;
  tables: string[];
}

export function getActiveSampleSql(s: SampleQuery): string {
  return isPostgres() && s.sqlPostgres ? s.sqlPostgres : s.sql;
}

export const SAMPLE_QUERIES: SampleQuery[] = [
  {
    question: "Daily ATM Hardware failures trend in Karachi last 90 days",
    tables: ["atm_failures", "atms", "branches"],
    sql: `SELECT date(f.failed_at) AS day, COUNT(*) AS failures
FROM atm_failures f
JOIN atms a ON a.id = f.atm_id
JOIN branches b ON b.id = a.branch_id
WHERE b.city = 'Karachi'
  AND f.reason = 'Hardware'
  AND f.failed_at >= date('now', '-90 day')
GROUP BY date(f.failed_at)
ORDER BY day
LIMIT 1000`,
    sqlPostgres: `SELECT (f.failed_at AT TIME ZONE 'UTC')::date AS day, COUNT(*) AS failures
FROM atm_failures f
JOIN atms a ON a.id = f.atm_id
JOIN branches b ON b.id = a.branch_id
WHERE b.city = 'Karachi'
  AND f.reason = 'Hardware'
  AND f.failed_at >= NOW() - INTERVAL '90 days'
GROUP BY 1
ORDER BY day
LIMIT 1000`,
  },
  {
    question: "ATM failures trend in last 90 days",
    tables: ["atm_failures"],
    sql: `SELECT date(failed_at) AS day, COUNT(*) AS failures
FROM atm_failures
WHERE failed_at >= date('now', '-90 day')
GROUP BY date(failed_at)
ORDER BY day
LIMIT 1000`,
    sqlPostgres: `SELECT (failed_at AT TIME ZONE 'UTC')::date AS day, COUNT(*) AS failures
FROM atm_failures
WHERE failed_at >= NOW() - INTERVAL '90 days'
GROUP BY 1
ORDER BY day
LIMIT 1000`,
  },
  {
    question: "Top 5 branches by transaction volume this month",
    tables: ["branches", "atms", "transactions", "accounts", "customers"],
    sql: `SELECT b.name AS branch, COUNT(t.id) AS tx_count, ROUND(SUM(t.amount), 2) AS total_amount
FROM transactions t
JOIN accounts a   ON a.id = t.account_id
JOIN customers c  ON c.id = a.customer_id
JOIN branches b   ON b.city = c.city
WHERE t.occurred_at >= date('now', 'start of month')
GROUP BY b.name
ORDER BY total_amount DESC
LIMIT 5`,
    sqlPostgres: `SELECT b.name AS branch, COUNT(t.id) AS tx_count, ROUND(SUM(t.amount)::numeric, 2) AS total_amount
FROM transactions t
JOIN accounts a   ON a.id = t.account_id
JOIN customers c  ON c.id = a.customer_id
JOIN branches b   ON b.city = c.city
WHERE t.occurred_at >= date_trunc('month', (NOW() AT TIME ZONE 'UTC'))
GROUP BY b.name
ORDER BY total_amount DESC
LIMIT 5`,
  },
  {
    question: "Distribution of ATM failure reasons in Karachi",
    tables: ["atm_failures", "atms", "branches"],
    sql: `SELECT f.reason, COUNT(*) AS failures
FROM atm_failures f
JOIN atms a    ON a.id = f.atm_id
JOIN branches b ON b.id = a.branch_id
WHERE b.city = 'Karachi'
GROUP BY f.reason
ORDER BY failures DESC
LIMIT 100`,
  },
  {
    question: "High-value transactions over 1M PKR in last 7 days",
    tables: ["transactions", "accounts", "customers"],
    sql: `SELECT t.id, c.name AS customer, t.amount, t.channel, t.occurred_at
FROM transactions t
JOIN accounts a  ON a.id = t.account_id
JOIN customers c ON c.id = a.customer_id
WHERE t.amount > 1000000
  AND t.occurred_at >= date('now', '-7 day')
ORDER BY t.amount DESC
LIMIT 100`,
    sqlPostgres: `SELECT t.id, c.name AS customer, t.amount, t.channel, t.occurred_at
FROM transactions t
JOIN accounts a  ON a.id = t.account_id
JOIN customers c ON c.id = a.customer_id
WHERE t.amount > 1000000
  AND t.occurred_at >= NOW() - INTERVAL '7 days'
ORDER BY t.amount DESC
LIMIT 100`,
  },
  {
    question: "Which customer segment opens the most savings accounts?",
    tables: ["customers", "accounts"],
    sql: `SELECT c.segment, COUNT(*) AS savings_accounts
FROM accounts a
JOIN customers c ON c.id = a.customer_id
WHERE a.type = 'Savings'
GROUP BY c.segment
ORDER BY savings_accounts DESC
LIMIT 100`,
  },
  {
    question: "ATM failures by city in last 90 days",
    tables: ["atm_failures", "atms", "branches"],
    sql: `SELECT b.city, COUNT(*) AS failures
FROM atm_failures f
JOIN atms a     ON a.id = f.atm_id
JOIN branches b ON b.id = a.branch_id
WHERE f.failed_at >= date('now', '-90 day')
GROUP BY b.city
ORDER BY failures DESC
LIMIT 100`,
    sqlPostgres: `SELECT b.city, COUNT(*) AS failures
FROM atm_failures f
JOIN atms a     ON a.id = f.atm_id
JOIN branches b ON b.id = a.branch_id
WHERE f.failed_at >= NOW() - INTERVAL '90 days'
GROUP BY b.city
ORDER BY failures DESC
LIMIT 100`,
  },
  {
    question: "Top failing ATM models",
    tables: ["atm_failures", "atms"],
    sql: `SELECT a.model, COUNT(*) AS failures
FROM atm_failures f
JOIN atms a ON a.id = f.atm_id
GROUP BY a.model
ORDER BY failures DESC
LIMIT 100`,
  },
  {
    question: "Failed transaction count by channel",
    tables: ["transactions"],
    sql: `SELECT channel, COUNT(*) AS failed_count
FROM transactions
WHERE status = 'Failed'
GROUP BY channel
ORDER BY failed_count DESC
LIMIT 100`,
  },
];
