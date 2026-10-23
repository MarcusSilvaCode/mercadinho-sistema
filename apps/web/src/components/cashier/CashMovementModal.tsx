import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { api, getApiErrorMessage } from "../../lib/api";
import type { CashMovementType } from "../../lib/types";

interface CashMovementModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export function CashMovementModal({ onClose, onSaved }: CashMovementModalProps) {
  const [type, setType] = useState<CashMovementType>("SANGRIA");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!amount || parsedAmount <= 0) {
      setError("Informe um valor válido.");
      return;
    }
    if (!reason.trim()) {
      setError("Informe o motivo.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/cashier/movements", { type, amount: parsedAmount, reason });
      onSaved();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-t-2xl bg-surface p-6 shadow-pop sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink-900">Sangria / Suprimento</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="-mr-2 flex h-9 w-9 items-center justify-center rounded-lg text-ink-300 hover:bg-surface-muted hover:text-ink-700">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4 flex overflow-hidden rounded-lg border border-surface-border">
            <button
              type="button"
              onClick={() => setType("SANGRIA")}
              className={`flex-1 py-2 text-sm font-medium transition ${
                type === "SANGRIA" ? "bg-danger-500 text-white" : "text-ink-500 hover:bg-surface-muted"
              }`}
            >
              Sangria (retirada)
            </button>
            <button
              type="button"
              onClick={() => setType("SUPRIMENTO")}
              className={`flex-1 py-2 text-sm font-medium transition ${
                type === "SUPRIMENTO" ? "bg-brand-500 text-white" : "text-ink-500 hover:bg-surface-muted"
              }`}
            >
              Suprimento (entrada)
            </button>
          </div>

          <label className="mb-1.5 block text-sm font-medium text-ink-700">Valor</label>
          <input
            type="number"
            step="0.01"
            min={0.01}
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="mb-4 w-full rounded-[10px] border border-surface-border px-3 h-11 font-money text-[15px] outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-surface placeholder:text-ink-300"
          />

          <label className="mb-1.5 block text-sm font-medium text-ink-700">Motivo</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={type === "SANGRIA" ? "Ex: depósito bancário" : "Ex: reforço de troco"}
            className="mb-4 w-full rounded-[10px] border border-surface-border px-3 h-11 text-[15px] outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-surface placeholder:text-ink-300"
          />

          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 flex-1 rounded-[10px] border border-surface-border px-4 h-11 text-sm font-semibold text-ink-900 transition hover:bg-brand-50 hover:border-brand-200 bg-surface"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 flex-1 rounded-[10px] bg-brand-500 px-4 h-11 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Salvando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
