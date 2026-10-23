import { create } from "zustand";
import { api } from "../lib/api";
import type { StoreSettings } from "../lib/types";

const NAME_CACHE_KEY = "mercadinho:nome-da-loja";

function readCachedName(): string {
  try {
    return localStorage.getItem(NAME_CACHE_KEY) || "Meu Mercadinho";
  } catch {
    return "Meu Mercadinho";
  }
}

interface StoreSettingsState {
  storeName: string;
  fetch: () => Promise<void>;
  setStoreName: (name: string) => void;
}

/**
 * Nome da loja exibido no menu e no login. Vem das Configurações; fica guardado
 * neste aparelho para a tela de login (que roda antes de autenticar).
 */
export const useStoreSettings = create<StoreSettingsState>((set) => ({
  storeName: readCachedName(),
  fetch: async () => {
    try {
      const { data } = await api.get<{ settings: StoreSettings }>("/settings");
      useStoreSettings.getState().setStoreName(data.settings.storeName);
    } catch {
      // mantém o nome em cache
    }
  },
  setStoreName: (name) => {
    const storeName = name.trim() || "Meu Mercadinho";
    try {
      localStorage.setItem(NAME_CACHE_KEY, storeName);
    } catch {
      // armazenamento bloqueado
    }
    set({ storeName });
  },
}));
