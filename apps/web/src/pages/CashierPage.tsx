import { FormEvent, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { useCashierStore } from "../store/cashierStore";
import { api, getApiErrorMessage } from "../lib/api";
import { formatCurrency, formatDate } from "../lib/format";
import { CashMovementModal } from "../components/cashier/CashMovementModal";
import { CloseCashierModal } from "../components/cashier/CloseCashierModal";

export function CashierPage() {
  const { session, totals, loading, fetchCurrent } = useCashierStore();
  const [movementOpen, setMovementOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  if (loading) {
    return <p className="text-sm text-ink-500">Carregando...</p>;
  }

  if (!session) {
    return <OpenCashierForm onOpened={fetchCurrent} />;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">Caixa aberto</h1>
          <p className="text-sm text-ink-500">
            {session.user.fullName} · desde {formatDate(session.openedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMovementOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-surface-border px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-surface-muted"
          >
            <ArrowDownCircle size={16} />
            Sangria / Suprimento
          </button>
          <button
            onClick={() => setCloseOpen(true)}
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            Fechar caixa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard label="Abertura" value={session.openingAmount} icon={Wallet} />
        <SummaryCard label="Vendas em dinheiro" value={totals?.paymentTotals.DINHEIRO ?? 0} icon={ArrowUpCircle} />
        <SummaryCard label="PIX" value={totals?.paymentTotals.PIX ?? 0} />
        <SummaryCard label="Débito + Crédito" value={(totals?.paymentTotals.DEBITO ?? 0) + (totals?.paymentTotals.CREDITO ?? 0)} />
        <SummaryCard label="Total vendido" value={totals?.totalSold ?? 0} />
        <SummaryCard label="Sangrias" value={-(totals?.sangrias ?? 0)} negative />
        <SummaryCard label="Suprimentos" value={totals?.suprimentos ?? 0} />
        <SummaryCard label="Dinheiro esperado" value={totals?.expectedCash ?? 0} highlight />
      </div>

      {movementOpen && (
        <CashMovementModal
          onClose={() => setMovementOpen(false)}
          onSaved={() => {
            setMovementOpen(false);
            fetchCurrent();
          }}
        />
      )}

      {closeOpen && (
        <CloseCashierModal
          session={session}
          onClose={() => setCloseOpen(false)}
          onClosed={() => {
            setCloseOpen(false);
            fetchCurrent();
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  highlight,
  negative,
}: {
  label: string;
  value: number | string;
  icon?: typeof Wallet;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-card ${
        highlight ? "border-brand-100 bg-brand-50" : "border-surface-border bg-surface"
      }`}
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-500">
        {Icon && <Icon size={13} />}
        {label}
      </div>
      <p className={`font-money text-lg font-semibold ${negative ? "text-danger-500" : "text-ink-900"}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function OpenCashierForm({ onOpened }: { onOpened: () => void }) {
  const [openingAmount, setOpeningAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = Number(openingAmount);
    if (!openingAmount || Number.isNaN(parsed) || parsed < 0) {
      setError("Informe um valor inicial válido.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/cashier/open", { openingAmount: parsed });
      onOpened();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border text-center">
      <Wallet className="mb-3 text-ink-300" size={32} />
      <h1 className="mb-1 text-lg font-semibold text-ink-900">Caixa fechado</h1>
      <p className="mb-4 max-w-sm text-sm text-ink-500">
        Informe o valor inicial (troco) para abrir o caixa e começar a vender.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <input
          type="number"
          step="0.01"
          min={0}
          autoFocus
          value={openingAmount}
          onChange={(e) => setOpeningAmount(e.target.value)}
          placeholder="0,00"
          className="mb-2 w-full rounded-lg border border-surface-border px-3 py-2.5 text-center font-money text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />

        {error && <p className="mb-3 text-sm text-danger-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          {submitting ? "Abrindo..." : "Abrir caixa"}
        </button>
      </form>
    </div>
  );
}
