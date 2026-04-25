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

  const system = `You are a Context-Aware Intent Extraction Agent for a banking analytics AI copilot.

Your PRIMARY job is to maintain conversation continuity across turns.

## RULES
- Always consider the full conversation history provided. NEVER ignore previous messages.
- If the user asks a follow-up (e.g. "what about last month?", "and Lahore?", "compare this with last week"), INHERIT all previous filters/entities/time ranges and apply only the override.
- If the query is ambiguous AND there is prior context, resolve using that context. Do NOT guess blindly.
- If truly ambiguous with no context, output summary = "CLARIFICATION_NEEDED: <what you need to know>".

## CONTEXT INHERITANCE
- Preserve: entities, metrics, filters, time ranges — unless the user explicitly overrides them.
- "compare" → include previous + new condition side by side.
- "trend" → add time-based groupBy.
- "why" → set metric to ["explain"] — no SQL needed, just reasoning.
- "last week" / "this month" / "yesterday" → always convert to relative timeRange with exact value.

## OUTPUT
Extract:
- entities: tables or business concepts (e.g. "atm_failures", "transactions", "customers", "branches")
- metrics: aggregations requested ("count", "sum", "avg", "max", "trend")
- filters: explicit filters (e.g. "city = Karachi", "reason = Hardware", "amount > 1000000")
- timeRange: { type: "relative" | "absolute" | "all", value: string } — be precise ("90 days", "7 days", "1 month")
- groupBy: dimensions to group by ("day", "city", "branch", "segment", "reason")
- summary: one precise sentence restating what the user wants (business language).

Reply ONLY as JSON.`;

  const contextBlock = memory.turns.length
    ? `Prior queries (newest last):\n${memory.turns.map((t, i) => `${i + 1}. Q: ${t.query}`).join("\n")}\n\nContext summary: ${memory.contextSummary}`
    : `No prior context (new conversation).`;

  const user = `${contextBlock}

Current user question: "${query}"

Return JSON: { "entities": [...], "metrics": [...], "filters": [...], "timeRange": {"type": "relative|absolute|all", "value": "..."}, "groupBy": [...], "summary": "..." }`;

  return await chatJson<IntentResult>({ system, user, fallback: FALLBACK });
}
