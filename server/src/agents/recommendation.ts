import { chatJson, MOCK_LLM } from "../llm/openai.js";
import { findMock, genericMock } from "../llm/mock.js";
import type { ExecutorResult } from "./executor.js";
import type { ExplanationResult } from "./explanation.js";

export interface RecommendationResult {
  recommendation: string;
  action: string;
}

const FALLBACK: RecommendationResult = {
  recommendation: "No specific action surfaced from this result.",
  action: "Review with your team",
};

function summarizeRows(result: ExecutorResult, max = 15): string {
  const head = result.rows.slice(0, max);
  const lines = [result.columns.join("\t"), ...head.map((r) => r.join("\t"))];
  if (result.rows.length > max) lines.push(`... (${result.rows.length - max} more rows)`);
  return lines.join("\n");
}

export async function recommendationAgent(
  query: string,
  result: ExecutorResult,
  explanation: ExplanationResult,
): Promise<RecommendationResult> {
  if (MOCK_LLM) {
    const mock = findMock(query) ?? genericMock(query);
    return mock.recommendation;
  }

  if (result.rows.length === 0) return FALLBACK;

  const system = `You are a Banking Recommendation Agent. Given a business question, the data, and the insight,
suggest ONE concrete operational action a branch/ops/risk manager could take this week.
Reply ONLY as JSON: { "recommendation": "imperative sentence (<= 30 words)", "action": "short action label (<= 10 words)" }.`;

  const user = `Question: ${query}
Insight: ${explanation.insight}
Key numbers: ${explanation.keyNumbers.join("; ")}
Data sample (${result.rowCount} rows):
${summarizeRows(result)}`;

  return await chatJson<RecommendationResult>({ system, user, fallback: FALLBACK, temperature: 0.4 });
}
