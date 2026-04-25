import { chatJson, MOCK_LLM } from "../llm/openai.js";
import { findMock, genericMock } from "../llm/mock.js";
import { isPostgres } from "../db/dialect.js";
import type { IntentResult } from "./intent.js";
import type { SchemaContextResult } from "./schemaRetrieval.js";
import type { MemoryAgentResult } from "./memory.js";
export interface SqlGenResult {
  sql: string;
  explanation: string;
}

const FALLBACK: SqlGenResult = {
  sql: "SELECT 'No SQL generated' AS message LIMIT 1",
  explanation: "LLM returned no SQL.",
};

export async function sqlGeneratorAgent(
  query: string,
  intent: IntentResult,
  schema: SchemaContextResult,
  memory: MemoryAgentResult,
): Promise<SqlGenResult> {
  if (MOCK_LLM) {
    const mock = findMock(query) ?? genericMock(query);
    return mock.sql;
  }

  const samples = schema.sampleSql.length
    ? `Reference SQL patterns (for style, not literal copy):\n${schema.sampleSql.map((s, i) => `Example ${i + 1}:\n${s.sql}`).join("\n\n")}\n\n`
    : "";

  const memoryBlock = memory.turns.length
    ? `Prior turns (oldest first):\n${memory.turns.map((t, i) => `${i + 1}. Q: ${t.query}\n   SQL: ${t.sql ?? "(none)"}`).join("\n")}\n\n`
    : "";

  const CONTEXT_RULES = `
## CONTEXT RULES (CRITICAL)
- This is a MULTI-TURN conversation. The prior queries in memoryBlock represent context you MUST carry forward.
- If the current query is a follow-up (e.g. "what about Lahore?", "now filter by Hardware only"), apply the change ON TOP of the previous SQL logic. Do not start from scratch.
- Preserve: previous time filters, entities, groupBy, metrics — unless the current query explicitly overrides them.
- If "compare" is used: generate a single query with CASE WHEN or UNION that compares old and new conditions.
- Never hallucinate tables or columns. Only use what is in the schema.
- Always add an explicit LIMIT (max 1000).
- Use descriptive aliases: AS day, AS failures, AS total_amount, AS branch_name.
- READ-ONLY: only SELECT or WITH ... SELECT.
`;

  const system = isPostgres()
    ? `You are a Context-Aware SQL Generation Agent for PostgreSQL 15+ (banking analytics, Neon-compatible).${CONTEXT_RULES}
## PostgreSQL specifics:
- Time filters: failed_at >= NOW() - INTERVAL '90 days'
- Monthly grouping: date_trunc('month', occurred_at AT TIME ZONE 'UTC')
- Daily bucketing: (failed_at AT TIME ZONE 'UTC')::date AS day
- ATM city filter: JOIN atm_failures -> atms -> branches ON branches.id = atms.branch_id, filter branches.city
- Hardware failures: atm_failures.reason = 'Hardware'

Reply ONLY as JSON: { "sql": "...", "explanation": "one short sentence" }.`
    : `You are a Context-Aware SQL Generation Agent for SQLite (banking analytics).${CONTEXT_RULES}
## SQLite specifics:
- Time filters: date(occurred_at) >= date('now', '-90 day')
- Monthly grouping: strftime('%Y-%m', occurred_at)
- Daily bucketing: date(failed_at) AS day

Reply ONLY as JSON: { "sql": "...", "explanation": "one short sentence" }.`;

  const user = `${memoryBlock}Schema (ONLY these tables/columns — never invent others):
${schema.schemaPrompt}

${samples}Detected intent for current question:
${JSON.stringify(intent, null, 2)}

User question: "${query}"

Generate SQL that:
1. Answers the CURRENT question
2. Preserves relevant context from prior turns
3. Uses ONLY the schema above

Return JSON: { "sql": "...", "explanation": "..." }.`;

  return await chatJson<SqlGenResult>({ system, user, fallback: FALLBACK, temperature: 0 });
}
