import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { api, getApiErrorMessage } from "../../lib/api";
import type { SaleDetail } from "../../lib/types";

interface ReturnModalProps {
  sale: SaleDetail;
  onClose: () => void;
  onReturned: () => void;
}

export function ReturnModal({ sale, onClose, onReturned }: ReturnModalProps) {
  const returnableItems = sale.items.filter((i) => i.quantity - i.returnedQuantity > 0);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateQty(itemId: string, value: string) {
    setQuantities((prev) => ({ ...prev, [itemId]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const items = Object.entries(quantities)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([saleItemId, qty]) => ({ saleItemId, quantity: Number(qty) }));

    if (items.length === 0) {
      setError("Informe a quantidade de ao menos um item para devolver.");
      return;
    }
    if (!reason.trim()) {
      setError("Informe o motivo da devolução.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/sales/${sale.id}/return`, { items, reason });
      onReturned();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-pop sm:rounded-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink-900">Devolver produtos</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="-mr-2 flex h-9 w-9 items-center justify-center rounded-lg text-ink-300 hover:bg-surface-muted hover:text-ink-700">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-sm text-ink-500">Venda #{sale.number}</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4 space-y-2">
            {returnableItems.map((item) => {
              const remaining = item.quantity - item.returnedQuantity;
              return (
                <div key={item.id} className="rounded-lg border border-surface-border p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-sm font-medium text-ink-900">{item.product.name}</p>
                    <p className="text-xs text-ink-500">
                      Disponível para devolução: <span className="font-money">{remaining}</span>
                    </p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={remaining}
                    value={quantities[item.id] ?? ""}
                    onChange={(e) => updateQty(item.id, e.target.value)}
                    placeholder="0"
                    className="w-24 rounded-lg border border-surface-border px-3 py-2 font-money text-sm outline-none focus:border-brand-500"
                  />
                </div>
              );
            })}
            {returnableItems.length === 0 && (
              <p className="text-sm text-ink-500">Todos os itens desta venda já foram devolvidos.</p>
            )}
          </div>

          <label className="mb-1.5 block text-sm font-medium text-ink-700">Motivo</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: produto com defeito"
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
              disabled={submitting || returnableItems.length === 0}
              className="inline-flex items-center justify-center gap-2 flex-1 rounded-[10px] bg-brand-500 px-4 h-11 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Processando..." : "Confirmar devolução"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
