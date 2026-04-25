import { isPostgres } from "../db/dialect.js";
import type { IntentResult } from "../agents/intent.js";
import type { SqlGenResult } from "../agents/sqlGenerator.js";
import type { ExplanationResult } from "../agents/explanation.js";
import type { RecommendationResult } from "../agents/recommendation.js";
import type { JudgeResult } from "../agents/validator.js";
interface MockSql extends SqlGenResult {
  /** When DATABASE_URL (PostgreSQL) is set, this dialect is used instead of SQLite `sql`. */
  sqlPostgres?: string;
}

interface MockEntry {
  match: (query: string) => boolean;
  intent: IntentResult;
  sql: MockSql;
  judge: JudgeResult;
  explanation: ExplanationResult;
  recommendation: RecommendationResult;
}
const lc = (s: string) => s.toLowerCase();

const MOCK_QUERIES: MockEntry[] = [
  {
    match: (q) => /atm.*fail.*(trend|90)/i.test(q) || /failures.*(last|past).*90/i.test(q),
    intent: {
      entities: ["atm_failures"],
      metrics: ["count"],
      filters: ["last 90 days"],
      timeRange: { type: "relative", value: "last 90 days" },
      groupBy: ["day"],
      summary: "Daily count of ATM failures over the last 90 days.",
    },
    sql: {
      sql: `SELECT date(failed_at) AS day, COUNT(*) AS failures
FROM atm_failures
WHERE failed_at >= date('now','-90 day')
GROUP BY date(failed_at)
ORDER BY day
LIMIT 1000`,
      sqlPostgres: `SELECT (failed_at AT TIME ZONE 'UTC')::date AS day, COUNT(*) AS failures
FROM atm_failures
WHERE failed_at >= NOW() - INTERVAL '90 days'
GROUP BY 1
ORDER BY day
LIMIT 1000`,
      explanation: "Group failures by day in the last 90 days, count per day, ordered chronologically.",
    },    judge: { label: "safe", confidence: 0.97, reason: "Read-only aggregation with explicit time window and LIMIT." },
    explanation: {
      insight: "ATM failures rose ~18% in the last 30 days, with Karachi branches accounting for the majority of the spike.",
      keyNumbers: ["+18% failures (last 30d vs prior 60d)", "Karachi: ~60% of recent failures"],
    },
    recommendation: {
      recommendation: "Investigate NCR-X1 ATMs in Karachi branches first; schedule preventive maintenance for the top 5 failing units.",
      action: "Open ticket for Karachi Ops to audit NCR-X1 fleet",
    },
  },
  {
    match: (q) => /top\s*5?.*branches?.*(transaction|volume)/i.test(q) || /branches.*by.*volume/i.test(q),
    intent: {
      entities: ["branches", "transactions"],
      metrics: ["sum", "count"],
      filters: ["this month"],
      timeRange: { type: "relative", value: "this month" },
      groupBy: ["branch"],
      summary: "Branches ranked by transaction value this month.",
    },
    sql: {
      sql: `SELECT b.name AS branch, COUNT(t.id) AS tx_count, ROUND(SUM(t.amount), 2) AS total_amount
FROM transactions t
JOIN accounts a   ON a.id = t.account_id
JOIN customers c  ON c.id = a.customer_id
JOIN branches b   ON b.city = c.city
WHERE t.occurred_at >= date('now','start of month')
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
      explanation: "Aggregate transactions to branch via customer city, sum amounts, take top 5.",
    },    judge: { label: "safe", confidence: 0.95, reason: "Aggregated read-only join with month filter and LIMIT 5." },
    explanation: {
      insight: "Karachi branches dominate the leaderboard, capturing the top transaction volumes for the month.",
      keyNumbers: ["#1 branch leads by ~25% over #2", "Top-5 ≈ 70% of total volume"],
    },
    recommendation: {
      recommendation: "Run a customer-experience pulse survey at the top branch; review staffing for #2 to capture spillover.",
      action: "Brief regional ops with a CX action plan for top branches",
    },
  },
  {
    match: (q) => /distribution.*(reasons?|reason).*atm/i.test(q) || /failure reasons?.*karachi/i.test(q),
    intent: {
      entities: ["atm_failures"],
      metrics: ["count"],
      filters: ["city = Karachi"],
      timeRange: { type: "all" },
      groupBy: ["reason"],
      summary: "Share of ATM failure reasons in Karachi.",
    },
    sql: {
      sql: `SELECT f.reason, COUNT(*) AS failures
FROM atm_failures f
JOIN atms a    ON a.id = f.atm_id
JOIN branches b ON b.id = a.branch_id
WHERE b.city = 'Karachi'
GROUP BY f.reason
ORDER BY failures DESC
LIMIT 100`,
      explanation: "Join failures to ATMs and branches, filter Karachi, group by reason.",
    },
    judge: { label: "safe", confidence: 0.96, reason: "Read-only grouped aggregation with city filter." },
    explanation: {
      insight: "Hardware and Cash Out are the dominant failure reasons in Karachi, together accounting for the majority of incidents.",
      keyNumbers: ["Hardware ≈ 40%", "Cash Out ≈ 30%"],
    },
    recommendation: {
      recommendation: "Prioritise hardware preventive maintenance and cash-replenishment SLAs for Karachi ATMs.",
      action: "Update Karachi ATM SLA targets and replenishment schedule",
    },
  },
  {
    match: (q) => /(high.value|over.*1m|>\s*1m|million).*transaction/i.test(q),
    intent: {
      entities: ["transactions", "customers"],
      metrics: [],
      filters: ["amount > 1,000,000", "last 7 days"],
      timeRange: { type: "relative", value: "last 7 days" },
      groupBy: [],
      summary: "Individual high-value transactions above 1M PKR in the last 7 days.",
    },
    sql: {
      sql: `SELECT t.id, c.name AS customer, t.amount, t.channel, t.occurred_at
FROM transactions t
JOIN accounts a  ON a.id = t.account_id
JOIN customers c ON c.id = a.customer_id
WHERE t.amount > 1000000
  AND t.occurred_at >= date('now','-7 day')
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
      explanation: "Detail high-value transactions joined with customer info, last 7 days, ordered by amount.",
    },    judge: { label: "safe", confidence: 0.94, reason: "Explicit amount threshold and time window." },
    explanation: {
      insight: "Several high-value transactions detected; flagged for AML/risk review.",
      keyNumbers: ["Largest > 4M PKR", "Online channel features prominently"],
    },
    recommendation: {
      recommendation: "Forward the list to the AML team for enhanced due diligence on top transactors.",
      action: "Trigger AML review workflow",
    },
  },
  {
    match: (q) => /segment.*(open|opens|opening).*saving/i.test(q) || /saving.*account.*segment/i.test(q),
    intent: {
      entities: ["customers", "accounts"],
      metrics: ["count"],
      filters: ["account.type = Savings"],
      timeRange: { type: "all" },
      groupBy: ["segment"],
      summary: "Savings account counts grouped by customer segment.",
    },
    sql: {
      sql: `SELECT c.segment, COUNT(*) AS savings_accounts
FROM accounts a
JOIN customers c ON c.id = a.customer_id
WHERE a.type = 'Savings'
GROUP BY c.segment
ORDER BY savings_accounts DESC
LIMIT 100`,
      explanation: "Filter savings accounts, join customer segment, count and order.",
    },
    judge: { label: "safe", confidence: 0.96, reason: "Simple grouped aggregation with explicit filter." },
    explanation: {
      insight: "Retail leads savings account openings, followed by Premier — together >70% of all savings accounts.",
      keyNumbers: ["Retail ≈ 40%", "Premier ≈ 30%"],
    },
    recommendation: {
      recommendation: "Cross-sell Premier savings products to top Retail savers using segment-based campaigns.",
      action: "Brief growth team to design Retail-to-Premier savings campaign",
    },
  },
  {
    match: (q) => /break.*(by|that).*city/i.test(q),
    intent: {
      entities: ["atm_failures", "branches"],
      metrics: ["count"],
      filters: ["last 90 days"],
      timeRange: { type: "relative", value: "last 90 days" },
      groupBy: ["city"],
      summary: "ATM failures broken down by city for the last 90 days.",
    },
    sql: {
      sql: `SELECT b.city, COUNT(*) AS failures
FROM atm_failures f
JOIN atms a     ON a.id = f.atm_id
JOIN branches b ON b.id = a.branch_id
WHERE f.failed_at >= date('now','-90 day')
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
      explanation: "Same time filter, now grouped by branch city to compare locations.",
    },    judge: { label: "safe", confidence: 0.96, reason: "Follow-up aggregation with same time window." },
    explanation: {
      insight: "Karachi clearly leads ATM failures by city, multiple times the next-highest city.",
      keyNumbers: ["Karachi: #1 by a wide margin"],
    },
    recommendation: {
      recommendation: "Stand up a Karachi ATM tiger team to drive failures down 30% in 60 days.",
      action: "Charter Karachi ATM reliability initiative",
    },
  },
];

export interface MockResponse {
  intent: IntentResult;
  sql: SqlGenResult;
  judge: JudgeResult;
  explanation: ExplanationResult;
  recommendation: RecommendationResult;
}

function toSqlResult(m: MockSql): SqlGenResult {
  if (isPostgres() && m.sqlPostgres) {
    return { sql: m.sqlPostgres, explanation: m.explanation };
  }
  return { sql: m.sql, explanation: m.explanation };
}

export function findMock(query: string): MockResponse | null {
  const q = lc(query);
  const hit = MOCK_QUERIES.find((m) => m.match(q));
  if (!hit) return null;
  return {
    intent: hit.intent,
    sql: toSqlResult(hit.sql),
    judge: hit.judge,
    explanation: hit.explanation,
    recommendation: hit.recommendation,
  };
}
export function genericMock(query: string): MockResponse {
  return {
    intent: {
      entities: [],
      metrics: ["count"],
      filters: [],
      timeRange: { type: "all" },
      groupBy: [],
      summary: `Best-effort interpretation of: "${query}"`,
    },
    sql: {
      sql: `SELECT 'Mock-LLM is enabled. Set MOCK_LLM=false and provide OPENAI_API_KEY to run real queries.' AS message LIMIT 1`,
      explanation: "Mock LLM is enabled — no LLM call was made.",
    },
    judge: { label: "safe", confidence: 0.5, reason: "Mock response." },
    explanation: {
      insight: "Mock-LLM response. Configure OPENAI_API_KEY and set MOCK_LLM=false to use the real pipeline.",
      keyNumbers: [],
    },
    recommendation: {
      recommendation: "Add OPENAI_API_KEY in server/.env and restart, or rely on mock responses for the seeded demo queries.",
      action: "Set OPENAI_API_KEY",
    },
  };
}
