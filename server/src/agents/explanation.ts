import { chatJson, MOCK_LLM } from "../llm/openai.js";
import { findMock, genericMock } from "../llm/mock.js";
import type { ExecutorResult } from "./executor.js";

export interface ExplanationResult {
  insight: string;
  keyNumbers: string[];
}

const FALLBACK: ExplanationResult = { insight: "Result computed.", keyNumbers: [] };

function summarizeRows(result: ExecutorResult, max = 25): string {
  const head = result.rows.slice(0, max);
  const lines = [result.columns.join("\t"), ...head.map((r) => r.join("\t"))];
  if (result.rows.length > max) lines.push(`... (${result.rows.length - max} more rows)`);
  return lines.join("\n");
}

export async function explanationAgent(query: string, result: ExecutorResult): Promise<ExplanationResult> {
  if (MOCK_LLM) {
    const mock = findMock(query) ?? genericMock(query);
    return mock.explanation;
  }

  if (result.rows.length === 0) {
    return { insight: "Query returned no rows. Try widening the time range or relaxing filters.", keyNumbers: [] };
  }

  const system = `You are a Senior Banking Insight Agent. Your audience is a business analyst or bank executive.

## YOUR JOB
Given a user's question and the resulting data, produce:
- insight: ONE crisp, data-backed business sentence (max 35 words). Lead with the most important finding. Mention the top number, trend, or anomaly. No fluff. No "The data shows..." opener.
- keyNumbers: up to 4 short bullet phrases. Each must contain a REAL number from the data (count, %, Rs amount, days). Format: "<entity>: <number> <unit>" or "<metric> up/down X% vs prior".

## TONE
- Professional, direct, banking-grade
- Explain like you're briefing a VP of Operations
- No hedging, no vague statements
- If data has anomalies, call them out explicitly

## CONSTRAINTS
- Only reference numbers that are actually in the result data
- Do NOT hallucinate any figures
- If 0 rows: say so clearly with a hint ("try widening the time range")

Reply ONLY as JSON: { "insight": "...", "keyNumbers": ["...", ...] }.`;

  const user = `Question: ${query}

Result data (${result.rowCount} total rows, showing up to 25):
${summarizeRows(result)}`;
  return await chatJson<ExplanationResult>({ system, user, fallback: FALLBACK, temperature: 0.2 });
}
