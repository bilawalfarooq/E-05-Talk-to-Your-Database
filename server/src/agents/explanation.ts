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

  const system = `You are a Banking Insight Agent. Given a question and the resulting tabular data, write:
- insight: ONE crisp business sentence (max 30 words). No fluff. Mention the most notable number or trend.
- keyNumbers: up to 3 short bullet phrases with concrete numbers/percentages.
Reply ONLY as JSON: { "insight": "...", "keyNumbers": ["...", ...] }.`;

  const user = `Question: ${query}\n\nResult (${result.rowCount} rows):\n${summarizeRows(result)}`;
  return await chatJson<ExplanationResult>({ system, user, fallback: FALLBACK, temperature: 0.3 });
}
