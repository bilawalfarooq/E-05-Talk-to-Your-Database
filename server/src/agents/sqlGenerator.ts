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

  const system = isPostgres()
    ? `You are a SQL Generation Agent for PostgreSQL 15+ (banking analytics) — Neon-compatible.
Rules:
- READ-ONLY: only SELECT (or WITH ... SELECT) statements.
- Always include an explicit LIMIT (max 1000).
- Use only the provided tables and columns. Never invent identifiers.
- Use PostgreSQL time filters: e.g. failed_at >= NOW() - INTERVAL '90 days', date_trunc('month', NOW() AT TIME ZONE 'UTC') for "start of this month" in UTC, (failed_at AT TIME ZONE 'UTC')::date for daily bucketing.
- Prefer descriptive aliases (AS day, AS failures, AS total_amount).
Reply ONLY as JSON: { "sql": "...", "explanation": "one short sentence" }.`
    : `You are a SQL Generation Agent for SQLite (banking analytics).
Rules:
- READ-ONLY: only SELECT (or WITH ... SELECT) statements.
- Always include an explicit LIMIT (max 1000).
- Use only the provided tables and columns. Never invent identifiers.
- Use SQLite date functions: date('now','-90 day'), date('now','start of month').
- Prefer descriptive aliases (AS day, AS failures, AS total_amount).
Reply ONLY as JSON: { "sql": "...", "explanation": "one short sentence" }.`;
  const user = `${memoryBlock}Schema (only these tables):
${schema.schemaPrompt}

${samples}Detected intent:
${JSON.stringify(intent, null, 2)}

User question: "${query}"

Return JSON.`;

  return await chatJson<SqlGenResult>({ system, user, fallback: FALLBACK, temperature: 0 });
}
