import { getMemory, type MemoryTurn } from "../memory/store.js";

export interface MemoryAgentResult {
  previousQueries: string[];
  contextSummary: string;
  turns: MemoryTurn[];
}

export async function memoryAgent(conversationId: string | undefined): Promise<MemoryAgentResult> {
  if (!conversationId) {
    return { previousQueries: [], contextSummary: "No prior context (new conversation).", turns: [] };
  }
  const turns = getMemory(conversationId);
  const previousQueries = turns.map((t) => t.query);
  const contextSummary = turns.length === 0
    ? "No prior context (new conversation)."
    : `User has asked ${turns.length} previous question(s): ${previousQueries.map((q) => `"${q}"`).join(", ")}.`;
  return { previousQueries, contextSummary, turns };
}
