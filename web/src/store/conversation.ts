import { create } from "zustand";
import { fetchConversations, saveConversation, removeConversation } from "../api/client";
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

export interface ConversationHistory {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

interface ConversationState {
  conversationId: string;
  messages: ChatMessage[];
  loading: boolean;
  selectedMessageId: string | null;
  history: ConversationHistory[];
  
  loadHistory: () => Promise<void>;
  addUser: (text: string) => string;
  addAssistantPending: (id: string) => void;
  fulfill: (assistantId: string, response: QueryResponse) => void;
  fail: (assistantId: string, error: string) => void;
  select: (id: string) => void;
  reset: () => void;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
}

const newConvId = () => `conv-${Math.random().toString(36).slice(2, 10)}`;

export const useConversation = create<ConversationState>((set, get) => {
  const updateHistory = (convId: string, messages: ChatMessage[]) => {
    if (messages.length === 0) return get().history;
    const firstUser = messages.find(m => m.role === "user");
    const title = firstUser ? firstUser.text : "New Conversation";
    const existing = get().history.filter((h) => h.id !== convId);
    const newConv = { id: convId, title, updatedAt: Date.now(), messages };
    saveConversation(newConv).catch(console.error);
    return [newConv, ...existing];
  };

  return {
    conversationId: newConvId(),
    messages: [],
    loading: false,
    selectedMessageId: null,
    history: [],

    loadHistory: async () => {
      try {
        const history = await fetchConversations();
        set({ history });
      } catch (err) {
        console.error("Failed to load history:", err);
      }
    },

    addUser: (text) => {
      const id = `m-${Date.now()}`;
      const newMessages = [...get().messages, { id, role: "user" as const, text, createdAt: Date.now() }];
      set({
        messages: newMessages,
        history: updateHistory(get().conversationId, newMessages),
      });
      return id;
    },

    addAssistantPending: (assistantId) => {
      const newMessages = [
        ...get().messages,
        { id: assistantId, role: "assistant" as const, text: "", loading: true, createdAt: Date.now() },
      ];
      set({
        loading: true,
        selectedMessageId: assistantId,
        messages: newMessages,
      });
    },

    fulfill: (assistantId, response) => {
      const newMessages = get().messages.map((m) =>
        m.id === assistantId
          ? { ...m, loading: false, response, text: response.explanation?.insight ?? "" }
          : m,
      );
      set({
        loading: false,
        selectedMessageId: assistantId,
        messages: newMessages,
        history: updateHistory(get().conversationId, newMessages),
      });
    },

    fail: (assistantId, error) => {
      const newMessages = get().messages.map((m) =>
        m.id === assistantId ? { ...m, loading: false, error, text: `Error: ${error}` } : m,
      );
      set({
        loading: false,
        messages: newMessages,
        history: updateHistory(get().conversationId, newMessages),
      });
    },

    select: (id) => set({ selectedMessageId: id }),

    reset: () => set({ conversationId: newConvId(), messages: [], selectedMessageId: null }),

    loadConversation: (id) => {
      const found = get().history.find((h) => h.id === id);
      if (found) {
        set({
          conversationId: found.id,
          messages: found.messages,
          selectedMessageId: found.messages[found.messages.length - 1]?.id ?? null,
        });
      }
    },

    deleteConversation: (id) => {
      removeConversation(id).catch(console.error);
      set({
        history: get().history.filter((h) => h.id !== id),
        ...(get().conversationId === id ? { conversationId: newConvId(), messages: [], selectedMessageId: null } : {})
      });
    },
  };
});

