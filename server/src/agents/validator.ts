import { chatJson, MOCK_LLM } from "../llm/openai.js";
import { findMock } from "../llm/mock.js";
import { sqlGuard, type GuardCheckResult } from "../safety/sqlGuard.js";
import { classifyQuery, type ClassifyResult } from "../ml/queryClassifier.js";
import type { RiskLabel } from "../ml/trainingSet.js";
import { runExplainQueryPlan } from "../db/query.js";
export interface JudgeResult {
  label: RiskLabel;
  confidence: number;
  reason: string;
}

export interface ValidatorResult {
  ok: boolean;
  rewrittenSql: string;
  guard: GuardCheckResult;
  classifier: ClassifyResult;
  judge: JudgeResult;
  combinedLabel: RiskLabel;
  combinedConfidence: number;
  blockedReason?: string;
  explainPlan?: string;
}

const JUDGE_FALLBACK: JudgeResult = { label: "safe", confidence: 0.5, reason: "Fallback judgement (no LLM available)." };

export async function validatorAgent(originalSql: string, userQuery: string): Promise<ValidatorResult> {
  const guard = sqlGuard(originalSql);
  if (!guard.ok) {
    return {
      ok: false,
      rewrittenSql: guard.rewrittenSql,
      guard,
      classifier: { label: "dangerous", confidence: 1, neighbors: [] },
      judge: { label: "dangerous", confidence: 1, reason: guard.blockedReason ?? "Blocked by safety guard." },
      combinedLabel: "dangerous",
      combinedConfidence: 1,
      blockedReason: guard.blockedReason,
    };
  }

  const classifier = await classifyQuery(guard.rewrittenSql);

  const judge: JudgeResult = MOCK_LLM
    ? (findMock(userQuery)?.judge ?? { label: "safe", confidence: 0.7, reason: "Mock judgement (deterministic)." })
    : await chatJson<JudgeResult>({
        system: `You are a SQL Risk Judge. Classify the given SQL into one of: safe, ambiguous, inefficient, dangerous.
- safe: read-only aggregation/projection with explicit filters and LIMIT.
- ambiguous: unclear intent (vague tables, missing filters).
- inefficient: SELECT *, big cartesian joins, missing WHERE/LIMIT on large tables.
- dangerous: any DDL/DML, system tables, multiple statements (should rarely happen here since the guard runs first).
Reply ONLY as JSON: { "label": "...", "confidence": 0..1, "reason": "..." }.`,
        user: `User question: "${userQuery}"\n\nSQL:\n${guard.rewrittenSql}`,
        fallback: JUDGE_FALLBACK,
        temperature: 0,
      });

  let explainPlan: string | undefined;
  try {
    explainPlan = await runExplainQueryPlan(guard.rewrittenSql);
  } catch (err) {
    return {
      ok: false,
      rewrittenSql: guard.rewrittenSql,
      guard,
      classifier,
      judge,
      combinedLabel: "ambiguous",
      combinedConfidence: 0.9,
      blockedReason: `Generated SQL did not parse: ${(err as Error).message}`,
    };
  }

  // Combine signals: prefer the more cautious label of the two.
  const ranking: RiskLabel[] = ["safe", "inefficient", "ambiguous", "dangerous"];
  const combinedLabel = ranking.indexOf(classifier.label) >= ranking.indexOf(judge.label) ? classifier.label : judge.label;
  const combinedConfidence = Math.round(((classifier.confidence + judge.confidence) / 2) * 100) / 100;

  return {
    ok: combinedLabel !== "dangerous",
    rewrittenSql: guard.rewrittenSql,
    guard,
    classifier,
    judge,
    combinedLabel,
    combinedConfidence,
    blockedReason: combinedLabel === "dangerous" ? "Classified as dangerous by the validator." : undefined,
    explainPlan,
  };
}
