import { create } from "zustand";
import { api } from "../lib/api";
import type { CashierSession, CashierTotals } from "../lib/types";

interface CashierState {
  session: CashierSession | null;
  totals: CashierTotals | null;
  loading: boolean;
  fetchCurrent: () => Promise<void>;
}

export const useCashierStore = create<CashierState>((set) => ({
  session: null,
  totals: null,
  loading: true,

  fetchCurrent: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get<{ session: CashierSession | null; totals: CashierTotals | null }>(
        "/cashier/current",
      );
      set({ session: data.session, totals: data.totals, loading: false });
    } catch {
      set({ session: null, totals: null, loading: false });
    }
  },
}));
