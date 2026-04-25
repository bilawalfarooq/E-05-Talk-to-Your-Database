import { create } from "zustand";
import type { QueryResponse } from "../api/client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  response?: QueryResponse;
  loading?: boolean;
  error?: string;
  createdAt: number;
}

interface ConversationState {
  conversationId: string;
  messages: ChatMessage[];
  loading: boolean;
  selectedMessageId: string | null;
  addUser: (text: string) => string;
  addAssistantPending: (id: string) => void;
  fulfill: (assistantId: string, response: QueryResponse) => void;
  fail: (assistantId: string, error: string) => void;
  select: (id: string) => void;
  reset: () => void;
}

const newConvId = () => `conv-${Math.random().toString(36).slice(2, 10)}`;

export const useConversation = create<ConversationState>((set, get) => ({
  conversationId: newConvId(),
  messages: [],
  loading: false,
  selectedMessageId: null,

  addUser: (text) => {
    const id = `m-${Date.now()}`;
    set({
      messages: [...get().messages, { id, role: "user", text, createdAt: Date.now() }],
    });
    return id;
  },

  addAssistantPending: (assistantId) => {
    set({
      loading: true,
      messages: [
        ...get().messages,
        { id: assistantId, role: "assistant", text: "", loading: true, createdAt: Date.now() },
      ],
    });
  },

  fulfill: (assistantId, response) => {
    set({
      loading: false,
      selectedMessageId: assistantId,
      messages: get().messages.map((m) =>
        m.id === assistantId
          ? { ...m, loading: false, response, text: response.explanation?.insight ?? "" }
          : m,
      ),
    });
  },

  fail: (assistantId, error) => {
    set({
      loading: false,
      messages: get().messages.map((m) =>
        m.id === assistantId ? { ...m, loading: false, error, text: `Error: ${error}` } : m,
      ),
    });
  },

  select: (id) => set({ selectedMessageId: id }),

  reset: () => set({ conversationId: newConvId(), messages: [], selectedMessageId: null }),
}));
