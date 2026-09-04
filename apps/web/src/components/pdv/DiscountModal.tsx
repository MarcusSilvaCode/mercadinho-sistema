import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { formatCurrency } from "../../lib/format";

interface DiscountModalProps {
  subtotal: number;
  currentDiscount: { type: "value" | "percent"; amount: number } | null;
  onClose: () => void;
  onApply: (discount: { type: "value" | "percent"; amount: number } | null) => void;
}

export function DiscountModal({ subtotal, currentDiscount, onClose, onApply }: DiscountModalProps) {
  const [type, setType] = useState<"value" | "percent">(currentDiscount?.type ?? "percent");
  const [amount, setAmount] = useState(currentDiscount ? String(currentDiscount.amount) : "");

  const parsedAmount = Number(amount) || 0;
  const discountValue = type === "percent" ? subtotal * (parsedAmount / 100) : parsedAmount;
  const finalTotal = Math.max(0, subtotal - discountValue);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!amount || parsedAmount <= 0) {
      onApply(null);
      return;
    }
    onApply({ type, amount: parsedAmount });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-surface p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">Aplicar desconto (F4)</h2>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4 flex overflow-hidden rounded-lg border border-surface-border">
            <button
              type="button"
              onClick={() => setType("percent")}
              className={`flex-1 py-2 text-sm font-medium transition ${
                type === "percent" ? "bg-brand-500 text-white" : "text-ink-500 hover:bg-surface-muted"
              }`}
            >
              Porcentagem
            </button>
            <button
              type="button"
              onClick={() => setType("value")}
              className={`flex-1 py-2 text-sm font-medium transition ${
                type === "value" ? "bg-brand-500 text-white" : "text-ink-500 hover:bg-surface-muted"
              }`}
            >
              Valor (R$)
            </button>
          </div>

          <input
            type="number"
            step="0.01"
            min={0}
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={type === "percent" ? "0" : "0,00"}
            className="mb-4 w-full rounded-lg border border-surface-border px-3 py-2.5 font-money text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />

          <div className="mb-4 space-y-1 rounded-lg border border-surface-border p-3 text-sm">
            <div className="flex justify-between text-ink-500">
              <span>Valor original</span>
              <span className="font-money">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-500">
              <span>Desconto</span>
              <span className="font-money">{formatCurrency(discountValue)}</span>
            </div>
            <div className="flex justify-between border-t border-surface-border pt-1 font-semibold text-ink-900">
              <span>Valor final</span>
              <span className="font-money">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {currentDiscount && (
              <button
                type="button"
                onClick={() => onApply(null)}
                className="flex-1 rounded-lg border border-surface-border px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-surface-muted"
              >
                Remover
              </button>
            )}
            <button
              type="submit"
              className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              Aplicar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
