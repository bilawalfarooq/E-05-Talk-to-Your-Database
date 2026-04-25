export interface AgentTraceEntry {
  agent: string;
  ms: number;
  ok: boolean;
  detail?: string;
}

export interface ChartSpec {
  type: "line" | "bar" | "pie" | "table";
  x?: string;
  y?: string;
  reason: string;
}

export interface ValidationInfo {
  ok: boolean;
  rewrittenSql: string;
  combinedLabel: "safe" | "ambiguous" | "inefficient" | "dangerous";
  combinedConfidence: number;
  guard: { checks: { name: string; passed: boolean; detail?: string }[]; ok: boolean };
  classifier: { label: string; confidence: number; neighbors: { text: string; label: string; score: number }[] };
  judge: { label: string; confidence: number; reason: string };
  blockedReason?: string;
  explainPlan?: string;
}

export interface QueryResponse {
  query: string;
  conversationId: string;
  memory: { previousQueries: string[]; contextSummary: string };
  intent: {
    entities: string[];
    metrics: string[];
    filters: string[];
    timeRange: { type: string; value?: string };
    groupBy: string[];
    summary: string;
  };
  schemaContext: {
    tables: { name: string; score: number }[];
    sampleSql: { sql: string; score: number }[];
    schemaPrompt: string;
  };
  sqlGen: { sql: string; explanation: string };
  validation: ValidationInfo;
  data: { columns: string[]; rows: unknown[][]; rowCount: number; durationMs: number } | null;
  chart: ChartSpec | null;
  explanation: { insight: string; keyNumbers: string[] } | null;
  recommendation: { recommendation: string; action: string } | null;
  alert: { level: "info" | "warning" | "critical"; message: string } | null;
  trace: AgentTraceEntry[];
  blocked: boolean;
  blockedReason?: string;
}

export interface SchemaInfo {
  tables: {
    table: string;
    description: string;
    columns: { name: string; type: string; description: string }[];
    relationships: string[];
    sampleQuestions: string[];
    rowCount: number;
  }[];
  sampleQueries: { question: string; tables: string[] }[];
}

const API_BASE = "/api";

export async function postQuery(query: string, conversationId: string): Promise<QueryResponse> {
  const res = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, conversationId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Query failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function getSchema(): Promise<SchemaInfo> {
  const res = await fetch(`${API_BASE}/schema`);
  return res.json();
}

export async function getHealth(): Promise<{ ok: boolean; mockLlm: boolean; model: string; database?: "postgresql" | "sqlite" }> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
