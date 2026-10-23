import { create } from "zustand";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

interface ToastItem {
  id: number;
  kind: "success" | "error";
  message: string;
}

interface ToastState {
  items: ToastItem[];
  push: (kind: ToastItem["kind"], message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: (kind, message) => {
    const id = nextId++;
    set({ items: [...get().items, { id, kind, message }].slice(-3) });
    setTimeout(() => get().dismiss(id), kind === "error" ? 6000 : 3500);
  },
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}));

/** Confirmação rápida de ação, igual em todo o sistema: toast.success("Produto salvo.") */
export const toast = {
  success: (message: string) => useToastStore.getState().push("success", message),
  error: (message: string) => useToastStore.getState().push("error", message),
};

export function Toaster() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:items-end"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-ink-900 px-4 py-3 text-sm text-white shadow-pop"
        >
          {t.kind === "success" ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#7FD4A6]" />
          ) : (
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-[#FF9C8F]" />
          )}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={() => dismiss(t.id)}
            className="-mr-1 text-white/60 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
