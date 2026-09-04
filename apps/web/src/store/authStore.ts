import { create } from "zustand";
import { api } from "../lib/api";

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
}

interface AuthState {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
  locked: boolean;
  fetchMe: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  lock: () => void;
  unlock: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "loading",
  locked: false,

  fetchMe: async () => {
    try {
      const { data } = await api.get<{ user: AuthUser }>("/auth/me");
      set({ user: data.user, status: "authenticated" });
    } catch {
      set({ user: null, status: "unauthenticated" });
    }
  },

  login: async (username: string, password: string) => {
    const { data } = await api.post<{ user: AuthUser }>("/auth/login", { username, password });
    set({ user: data.user, status: "authenticated", locked: false });
  },

  logout: async () => {
    await api.post("/auth/logout");
    set({ user: null, status: "unauthenticated", locked: false });
  },

  // Não encerra a sessão nem limpa dados — só trava a UI até reautenticar
  lock: () => set({ locked: true }),
  unlock: () => set({ locked: false }),
}));
