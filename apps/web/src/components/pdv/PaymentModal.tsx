import { useMemo, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "../../lib/format";
import type { PaymentMethod, SalePaymentInput } from "../../lib/types";

interface PaymentModalProps {
  total: number;
  onClose: () => void;
  onConfirm: (payments: SalePaymentInput[], receivedAmount?: number) => void;
  submitting: boolean;
  error: string | null;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  DEBITO: "Débito",
  CREDITO: "Crédito",
};

interface Row {
  key: string;
  method: PaymentMethod;
  amount: string;
}

export function PaymentModal({ total, onClose, onConfirm, submitting, error }: PaymentModalProps) {
  const [rows, setRows] = useState<Row[]>([{ key: crypto.randomUUID(), method: "DINHEIRO", amount: total.toFixed(2) }]);
  const [receivedCash, setReceivedCash] = useState("");

  const sumEntered = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const remaining = Math.round((total - sumEntered) * 100) / 100;
  const hasCash = rows.some((r) => r.method === "DINHEIRO" && Number(r.amount) > 0);
  const cashPortion = rows
    .filter((r) => r.method === "DINHEIRO")
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const changePreview = useMemo(() => {
    const received = Number(receivedCash);
    if (!hasCash || !receivedCash || Number.isNaN(received)) return null;
    return Math.round((received - cashPortion) * 100) / 100;
  }, [receivedCash, hasCash, cashPortion]);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { key: crypto.randomUUID(), method: "PIX", amount: remaining > 0 ? remaining.toFixed(2) : "" }]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  function handleConfirm() {
    const payments: SalePaymentInput[] = rows
      .filter((r) => Number(r.amount) > 0)
      .map((r) => ({ method: r.method, amount: Number(r.amount) }));

    const received = hasCash && receivedCash ? Number(receivedCash) : undefined;
    onConfirm(payments, received);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-t-2xl bg-surface p-6 shadow-pop sm:rounded-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink-900">Finalizar venda (F5)</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="-mr-2 flex h-9 w-9 items-center justify-center rounded-lg text-ink-300 hover:bg-surface-muted hover:text-ink-700">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-sm text-ink-500">
          Total a pagar: <span className="font-money font-semibold text-ink-900">{formatCurrency(total)}</span>
        </p>

        <div className="mb-3 space-y-2">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-2">
              <select
                value={row.method}
                onChange={(e) => updateRow(row.key, { method: e.target.value as PaymentMethod })}
                className="rounded-lg border border-surface-border px-2 py-2 text-sm outline-none focus:border-brand-500"
              >
                {Object.entries(METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min={0}
                value={row.amount}
                onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                placeholder="0,00"
                className="flex-1 rounded-lg border border-surface-border px-3 py-2 font-money text-sm outline-none focus:border-brand-500"
              />
              <button
                onClick={() => removeRow(row.key)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-danger-50 hover:text-danger-500"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addRow}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <Plus size={15} /> Dividir pagamento
        </button>

        {remaining !== 0 && (
          <p className={`mb-3 text-sm ${remaining > 0 ? "text-amber-500" : "text-danger-500"}`}>
            {remaining > 0
              ? `Faltam ${formatCurrency(remaining)} para completar o total.`
              : `Os pagamentos excedem o total em ${formatCurrency(Math.abs(remaining))}.`}
          </p>
        )}

        {hasCash && (
          <div className="mb-4 rounded-lg border border-surface-border p-3">
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              Valor recebido em dinheiro (para calcular o troco)
            </label>
            <input
              type="number"
              step="0.01"
              min={cashPortion}
              value={receivedCash}
              onChange={(e) => setReceivedCash(e.target.value)}
              placeholder={cashPortion.toFixed(2)}
              className="w-full rounded-lg border border-surface-border px-3 py-2 font-money text-sm outline-none focus:border-brand-500"
            />
            {changePreview !== null && changePreview >= 0 && (
              <p className="mt-1.5 text-sm font-medium text-brand-600">
                Troco: <span className="font-money">{formatCurrency(changePreview)}</span>
              </p>
            )}
          </div>
        )}

        {error && <div className="mb-4 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 flex-1 rounded-[10px] border border-surface-border px-4 h-11 text-sm font-semibold text-ink-900 transition hover:bg-brand-50 hover:border-brand-200 bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || remaining !== 0}
            className="inline-flex items-center justify-center gap-2 flex-1 rounded-[10px] bg-brand-500 px-4 h-11 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Finalizando..." : "Confirmar pagamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
