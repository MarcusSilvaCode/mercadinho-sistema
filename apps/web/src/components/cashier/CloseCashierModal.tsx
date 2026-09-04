import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { api, getApiErrorMessage } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import type { CashierSession, CashierTotals } from "../../lib/types";

interface CloseCashierModalProps {
  session: CashierSession;
  onClose: () => void;
  onClosed: () => void;
}

export function CloseCashierModal({ session, onClose, onClosed }: CloseCashierModalProps) {
  const [totals, setTotals] = useState<CashierTotals | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [countedCash, setCountedCash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<{ totals: CashierTotals }>(`/cashier/${session.id}/summary`)
      .then(({ data }) => setTotals(data.totals))
      .finally(() => setLoadingSummary(false));
  }, [session.id]);

  const parsedCounted = Number(countedCash);
  const difference =
    totals && countedCash && !Number.isNaN(parsedCounted) ? parsedCounted - totals.expectedCash : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!countedCash || Number.isNaN(parsedCounted) || parsedCounted < 0) {
      setError("Informe o valor contado em dinheiro.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/cashier/${session.id}/close`, { countedCash: parsedCounted });
      onClosed();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">Fechamento de caixa</h2>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-500">
            <X size={18} />
          </button>
        </div>

        {loadingSummary && <p className="py-6 text-center text-sm text-ink-500">Calculando resumo...</p>}

        {totals && (
          <>
            <div className="mb-4 space-y-1.5 rounded-lg border border-surface-border p-3 text-sm">
              <SummaryRow label="Abertura" value={session.openingAmount} />
              <SummaryRow label="Vendas em dinheiro" value={totals.paymentTotals.DINHEIRO} />
              <SummaryRow label="Vendas em PIX" value={totals.paymentTotals.PIX} />
              <SummaryRow label="Vendas em débito" value={totals.paymentTotals.DEBITO} />
              <SummaryRow label="Vendas em crédito" value={totals.paymentTotals.CREDITO} />
              <SummaryRow label="Sangrias" value={-totals.sangrias} />
              <SummaryRow label="Suprimentos" value={totals.suprimentos} />
              <div className="mt-1.5 flex justify-between border-t border-surface-border pt-1.5 font-semibold">
                <span className="text-ink-900">Dinheiro esperado</span>
                <span className="font-money text-ink-900">{formatCurrency(totals.expectedCash)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Dinheiro contado no caixa</label>
              <input
                type="number"
                step="0.01"
                min={0}
                autoFocus
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                placeholder="0,00"
                className="mb-2 w-full rounded-lg border border-surface-border px-3 py-2.5 font-money text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />

              {difference !== null && (
                <p
                  className={`mb-4 text-sm font-medium ${
                    difference === 0 ? "text-ink-500" : difference > 0 ? "text-brand-600" : "text-danger-500"
                  }`}
                >
                  {difference === 0 && "Confere exatamente com o esperado."}
                  {difference > 0 && `Sobra de ${formatCurrency(difference)}.`}
                  {difference < 0 && `Falta ${formatCurrency(Math.abs(difference))}.`}
                </p>
              )}

              {error && (
                <div className="mb-4 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>
              )}

              <div className="flex gap-2">
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
                  {submitting ? "Fechando..." : "Confirmar fechamento"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between text-ink-500">
      <span>{label}</span>
      <span className="font-money">{formatCurrency(value)}</span>
    </div>
  );
}
