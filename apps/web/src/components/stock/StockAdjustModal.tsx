import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { api, getApiErrorMessage } from "../../lib/api";
import type { Product } from "../../lib/types";

interface StockAdjustModalProps {
  product: Product;
  onClose: () => void;
  onSaved: () => void;
}

const REASON_PRESETS = ["Perda", "Produto quebrado", "Vencimento", "Erro de contagem", "Correção"];

export function StockAdjustModal({ product, onClose, onSaved }: StockAdjustModalProps) {
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState(REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const finalReason = reason === "Outro" ? customReason : reason;
  const parsedQty = Number(quantity);
  const newStockPreview =
    quantity && !Number.isNaN(parsedQty)
      ? product.stockQuantity + (direction === "add" ? parsedQty : -parsedQty)
      : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!quantity || parsedQty <= 0) {
      setError("Informe uma quantidade válida.");
      return;
    }
    if (!finalReason.trim()) {
      setError("Informe o motivo do ajuste.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/stock/adjust", {
        productId: product.id,
        quantity: direction === "add" ? parsedQty : -parsedQty,
        reason: finalReason,
      });
      onSaved();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-surface p-6 shadow-card">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">Ajustar estoque</h2>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-500">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-sm text-ink-500">{product.name}</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4 flex overflow-hidden rounded-lg border border-surface-border">
            <button
              type="button"
              onClick={() => setDirection("add")}
              className={`flex-1 py-2 text-sm font-medium transition ${
                direction === "add" ? "bg-brand-500 text-white" : "text-ink-500 hover:bg-surface-muted"
              }`}
            >
              Aumentar
            </button>
            <button
              type="button"
              onClick={() => setDirection("remove")}
              className={`flex-1 py-2 text-sm font-medium transition ${
                direction === "remove" ? "bg-danger-500 text-white" : "text-ink-500 hover:bg-surface-muted"
              }`}
            >
              Diminuir
            </button>
          </div>

          <label className="mb-1.5 block text-sm font-medium text-ink-700">Quantidade</label>
          <input
            type="number"
            min={1}
            autoFocus
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="mb-1 w-full rounded-lg border border-surface-border px-3 py-2.5 font-money text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          {newStockPreview !== null && (
            <p className={`mb-4 text-xs ${newStockPreview < 0 ? "text-danger-500" : "text-ink-500"}`}>
              Estoque atual: {product.stockQuantity} → novo estoque:{" "}
              <span className="font-money font-semibold">{newStockPreview}</span>
              {newStockPreview < 0 && " (ficará negativo)"}
            </p>
          )}

          <label className="mb-1.5 block text-sm font-medium text-ink-700">Motivo</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mb-2 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-brand-500"
          >
            {REASON_PRESETS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value="Outro">Outro...</option>
          </select>

          {reason === "Outro" && (
            <input
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Descreva o motivo"
              className="mb-4 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          )}

          {error && (
            <div className="mb-4 mt-2 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-surface-border px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-surface-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Salvando..." : "Confirmar ajuste"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
