import { memoryAgent, type MemoryAgentResult } from "./agents/memory.js";
import { intentAgent, type IntentResult } from "./agents/intent.js";
import { schemaRetrievalAgent, type SchemaContextResult } from "./agents/schemaRetrieval.js";
import { sqlGeneratorAgent, type SqlGenResult } from "./agents/sqlGenerator.js";
import { validatorAgent, type ValidatorResult } from "./agents/validator.js";
import { executorAgent, type ExecutorResult } from "./agents/executor.js";
import { visualizationAgent, type VisualizationResult } from "./agents/visualization.js";
import { explanationAgent, type ExplanationResult } from "./agents/explanation.js";
import { recommendationAgent, type RecommendationResult } from "./agents/recommendation.js";
import { appendMemory } from "./memory/store.js";

export interface AgentTraceEntry {
  agent: string;
  ms: number;
  ok: boolean;
  detail?: string;
}

export interface AlertResult {
  level: "info" | "warning" | "critical";
  message: string;
}

export interface PipelineResult {
  query: string;
  conversationId: string;
  memory: MemoryAgentResult;
  intent: IntentResult;
  schemaContext: SchemaContextResult;
  sqlGen: SqlGenResult;
  validation: ValidatorResult;
  data: { columns: string[]; rows: unknown[][]; rowCount: number; durationMs: number } | null;
  chart: VisualizationResult | null;
  explanation: ExplanationResult | null;
  recommendation: RecommendationResult | null;
  alert: AlertResult | null;
  trace: AgentTraceEntry[];
  blocked: boolean;
  blockedReason?: string;
}

async function timed<T>(name: string, fn: () => Promise<T> | T, trace: AgentTraceEntry[]): Promise<T> {
  const start = Date.now();
  try {
    const value = await fn();
    trace.push({ agent: name, ms: Date.now() - start, ok: true });
    return value;
  } catch (err) {
    trace.push({ agent: name, ms: Date.now() - start, ok: false, detail: (err as Error).message });
    throw err;
  }
}

function deriveAlert(query: string, data: ExecutorResult, label: string): AlertResult | null {
  if (data.rowCount === 0) return null;
  const q = query.toLowerCase();
  if (label === "dangerous") {
    return { level: "critical", message: "Query flagged as dangerous and was blocked." };
  }
  if (q.includes("failure") || q.includes("failed")) {
    // Sum the first numeric column when looking at failures.
    const numericIdx = data.columns.findIndex((_, i) => typeof data.rows[0][i] === "number");
    if (numericIdx >= 0) {
      const total = data.rows.reduce((acc, r) => acc + ((r[numericIdx] as number) ?? 0), 0);
      if (total > 100) return { level: "warning", message: `Failure volume is high (${total.toLocaleString()} events) — review threshold.` };
    }
  }
  if (q.includes("high-value") || q.includes("over 1m") || q.includes("million")) {
    if (data.rowCount > 10) return { level: "warning", message: `${data.rowCount} high-value transactions in window — escalate to AML.` };
  }
  return null;
}

export async function runPipeline(query: string, conversationId: string): Promise<PipelineResult> {
  const trace: AgentTraceEntry[] = [];

  const memory = await timed("memory", () => memoryAgent(conversationId), trace);
  const intent = await timed("intent", () => intentAgent(query, memory), trace);
  const schemaContext = await timed("schemaRetrieval", () => schemaRetrievalAgent(query, intent.entities), trace);
  const sqlGen = await timed("sqlGenerator", () => sqlGeneratorAgent(query, intent, schemaContext, memory), trace);
  const validation = await timed("validator", () => validatorAgent(sqlGen.sql, query), trace);

  if (!validation.ok) {
    return {
      query,
      conversationId,
      memory,
      intent,
      schemaContext,
      sqlGen,
      validation,
      data: null,
      chart: null,
      explanation: { insight: validation.blockedReason ?? "Query blocked by validator.", keyNumbers: [] },
      recommendation: { recommendation: "Rephrase the question more specifically and try again.", action: "Refine query" },
      alert: { level: "critical", message: validation.blockedReason ?? "Blocked by validator." },
      trace,
      blocked: true,
      blockedReason: validation.blockedReason,
    };
  }

  const data = await timed("executor", () => executorAgent(validation.rewrittenSql), trace);
  const chart = await timed("visualization", () => visualizationAgent(data), trace);
  const explanation = await timed("explanation", () => explanationAgent(query, data), trace);
  const recommendation = await timed("recommendation", () => recommendationAgent(query, data, explanation), trace);
  const alert = deriveAlert(query, data, validation.combinedLabel);

  appendMemory(conversationId, {
    query,
    sql: validation.rewrittenSql,
    resultSummary: `${data.rowCount} rows; cols: ${data.columns.join(", ")}`,
    at: new Date().toISOString(),
  });

  return {
    query,
    conversationId,
    memory,
    intent,
    schemaContext,
    sqlGen,
    validation,
    data,
    chart,
    explanation,
    recommendation,
    alert,
    trace,
    blocked: false,
  };
}
