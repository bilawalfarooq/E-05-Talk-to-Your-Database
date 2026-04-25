export interface MemoryTurn {
  query: string;
  sql?: string;
  resultSummary?: string;
  at: string;
}

const conversations = new Map<string, MemoryTurn[]>();
const MAX_TURNS = 5;

export function getMemory(conversationId: string): MemoryTurn[] {
  return conversations.get(conversationId) ?? [];
}

export function appendMemory(conversationId: string, turn: MemoryTurn): void {
  const arr = conversations.get(conversationId) ?? [];
  arr.push(turn);
  while (arr.length > MAX_TURNS) arr.shift();
  conversations.set(conversationId, arr);
}

export function clearMemory(conversationId: string): void {
  conversations.delete(conversationId);
}
