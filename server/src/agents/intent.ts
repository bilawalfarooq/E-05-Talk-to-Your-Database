import { chatJson, MOCK_LLM } from "../llm/openai.js";
import { findMock, genericMock } from "../llm/mock.js";
import type { MemoryAgentResult } from "./memory.js";

export interface IntentResult {
  entities: string[];
  metrics: string[];
  filters: string[];
  timeRange: { type: "relative" | "absolute" | "all"; value?: string };
  groupBy: string[];
  summary: string;
}

const FALLBACK: IntentResult = {
  entities: [],
  metrics: ["count"],
  filters: [],
  timeRange: { type: "all" },
  groupBy: [],
  summary: "Best-effort intent.",
};

export async function intentAgent(query: string, memory: MemoryAgentResult): Promise<IntentResult> {
  if (MOCK_LLM) {
    const mock = findMock(query) ?? genericMock(query);
    return mock.intent;
  }

  const system = `You are an Intent Extraction Agent for a banking analytics assistant.
Given a natural-language question (and optional prior conversation), extract:
- entities: tables or business concepts referenced (e.g. "atm_failures", "transactions", "customers")
- metrics: aggregations requested (e.g. "count", "sum", "avg")
- filters: any explicit filters (e.g. "city = Karachi", "amount > 1000000")
- timeRange: { type: "relative" | "absolute" | "all", value: string }
- groupBy: dimensions to group by (e.g. "day", "city", "segment")
- summary: one-sentence restatement of what the user wants.
Reply ONLY as JSON.`;

  const user = `Conversation context: ${memory.contextSummary}

User question: "${query}"

Return JSON: { "entities": [...], "metrics": [...], "filters": [...], "timeRange": {"type": "relative|absolute|all", "value": "..."}, "groupBy": [...], "summary": "..." }`;

  return await chatJson<IntentResult>({ system, user, fallback: FALLBACK });
}
