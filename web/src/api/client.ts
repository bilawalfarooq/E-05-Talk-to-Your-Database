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

export interface HealthResponse {
  ok: boolean;
  time: string;
  database: "postgresql" | "sqlite";
  databaseDetail: string;
  llmProvider: "gemini" | "openai";
  model: string;
  embedModel: string;
  mockLlm: boolean;
  mockLlmReasons: string[];
  embeddings: "live" | "mock";
  envFiles: { serverDotEnv: boolean; repoRootDotEnv: boolean };
  postgresAutoSeed: boolean;
  hints: string[];
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export interface DashboardMetricsPayload {
  windowDays: number;
  source: "postgresql" | "sqlite";
  kpis: {
    totalFailures: number;
    avgFailuresPerDay: number;
    mostAffectedCity: string;
    mostAffectedCityCount: number;
    mostAffectedCityPct: number;
    mttrHours: number;
    trendVsPreviousPct: number;
    hardwareFailuresInWindow: number;
  };
  karachiHardwareTrend: {
    columns: string[];
    rows: unknown[][];
    rowCount: number;
  };
  recentFailures: {
    columns: string[];
    rows: unknown[][];
    rowCount: number;
  };
  loadedAt: string;
}

export async function getDashboardMetrics(): Promise<DashboardMetricsPayload> {
  const res = await fetch(`${API_BASE}/metrics/dashboard`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Metrics failed (${res.status}): ${text}`);
  }
  return res.json();
}

function getAuthToken(): string {
  try {
    const raw = localStorage.getItem("ai-copilot-auth");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    // Zustand persist stores state under the 'state' key
    return parsed?.state?.token ?? "";
  } catch {
    return "";
  }
}

export async function fetchConversations() {
  const res = await fetch(`${API_BASE}/conversations`, {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function saveConversation(conv: any) {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(conv),
  });
  return res.json();
}

export async function removeConversation(id: string) {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  return res.json();
}
