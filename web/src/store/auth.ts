import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  email: string;
  name: string;
  role: string;
  avatar: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const API = "/api/auth";

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,
      error: null,

      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const res = await fetch(`${API}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const text = await res.text();
          if (!text) throw new Error("Server not reachable. Make sure the backend is running on port 3001.");
          const data = JSON.parse(text);
          if (!res.ok) throw new Error(data.error ?? "Login failed");
          set({ token: data.token, user: data.user, loading: false, error: null });
        } catch (err) {
          set({ loading: false, error: (err as Error).message });
        }
      },

      logout: async () => {
        const token = get().token;
        if (token) {
          await fetch(`${API}/logout`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }
        // Clear conversation store so next user starts fresh
        const { useConversation } = await import("./conversation");
        useConversation.getState().reset();
        useConversation.setState({ history: [] });
        set({ token: null, user: null, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "ai-copilot-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
