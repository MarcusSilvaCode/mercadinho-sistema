import { FormEvent, useState } from "react";
import { ArrowDownUp, Lock, Wallet } from "lucide-react";
import { useCashierStore } from "../store/cashierStore";
import { api, getApiErrorMessage } from "../lib/api";
import { formatCurrency, formatDateTime, formatSignedCurrency } from "../lib/format";
import { parseMoneyInput } from "../lib/pricing";
import { CashMovementModal } from "../components/cashier/CashMovementModal";
import { CloseCashierModal } from "../components/cashier/CloseCashierModal";
import { Button } from "../components/ui/Button";
import { ErrorMessage } from "../components/ui/Field";
import { PageHeader, Panel, Skeleton } from "../components/ui/Layout";
import { toast } from "../components/ui/Toast";

export function CashierPage() {
  const { session, totals, loading, fetchCurrent } = useCashierStore();
  const [movementOpen, setMovementOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  if (loading) {
    return (
      <Panel padded={false}>
        <Skeleton rows={5} />
      </Panel>
    );
  }

  if (!session) {
    return <OpenCashierForm onOpened={fetchCurrent} />;
  }

  const p = totals?.paymentTotals ?? { DINHEIRO: 0, PIX: 0, DEBITO: 0, CREDITO: 0 };
  const sangrias = totals?.sangrias ?? 0;
  const suprimentos = totals?.suprimentos ?? 0;

  return (
    <div>
      <PageHeader
        title="Caixa aberto"
        description={`${session.user.fullName} · aberto em ${formatDateTime(session.openedAt)}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setMovementOpen(true)}>
              <ArrowDownUp size={16} /> Sangria / Suprimento
            </Button>
            <Button onClick={() => setCloseOpen(true)}>
              <Lock size={16} /> Fechar caixa
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* A conta da gaveta, de cima para baixo */}
        <section aria-label="Dinheiro na gaveta" className="rounded-2xl border-2 border-brand-500 bg-surface p-6 md:p-8">
          <p className="text-sm font-semibold text-ink-500">Dinheiro esperado na gaveta</p>
          <p className="mt-2 font-display text-5xl font-extrabold leading-none tracking-tight text-brand-500 font-money">
            {formatCurrency(totals?.expectedCash ?? 0)}
          </p>

          <dl className="mt-8 space-y-3 border-t border-surface-border pt-6 text-[15px]">
            <Line label="Troco de abertura" value={formatCurrency(session.openingAmount)} />
            <Line label="Vendas em dinheiro" value={formatSignedCurrency(p.DINHEIRO, "+")} />
            <Line label="Suprimentos" value={formatSignedCurrency(suprimentos, "+")} />
            <Line label="Sangrias" value={formatSignedCurrency(sangrias, "-")} />
            <div className="flex items-baseline justify-between border-t border-dashed border-surface-border pt-3 font-semibold text-ink-900">
              <dt>Total esperado</dt>
              <dd className="font-money">{formatCurrency(totals?.expectedCash ?? 0)}</dd>
            </div>
          </dl>
        </section>

        <section aria-label="Vendas do caixa" className="rounded-2xl border border-surface-border bg-surface p-6 md:p-8">
          <p className="text-sm font-semibold text-ink-500">Total vendido neste caixa</p>
          <p className="mt-2 font-display text-4xl font-bold tracking-tight text-ink-900 font-money">
            {formatCurrency(totals?.totalSold ?? 0)}
          </p>

          <dl className="mt-8 space-y-3 border-t border-surface-border pt-6 text-[15px]">
            <Line label="Dinheiro" value={formatCurrency(p.DINHEIRO)} />
            <Line label="Pix" value={formatCurrency(p.PIX)} />
            <Line label="Débito" value={formatCurrency(p.DEBITO)} />
            <Line label="Crédito" value={formatCurrency(p.CREDITO)} />
          </dl>
          <p className="mt-6 text-sm text-ink-500">
            Pix e cartões não entram na gaveta: confira pelo extrato da maquininha e do banco.
          </p>
        </section>
      </div>

      {movementOpen && (
        <CashMovementModal
          onClose={() => setMovementOpen(false)}
          onSaved={() => {
            setMovementOpen(false);
            toast.success("Movimentação registrada.");
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
            toast.success("Caixa fechado.");
            fetchCurrent();
          }}
        />
      )}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-ink-700">
      <dt>{label}</dt>
      <dd className="font-medium text-ink-900 font-money">{value}</dd>
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

    const parsed = parseMoneyInput(openingAmount);
    if (Number.isNaN(parsed) || parsed < 0) {
      setError("Informe o valor do troco (pode ser 0).");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/cashier/open", { openingAmount: parsed });
      toast.success("Caixa aberto. Boas vendas!");
      onOpened();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-surface-border bg-surface p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
          <Wallet size={26} strokeWidth={1.75} />
        </div>
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink-900">Abrir o caixa</h1>
        <p className="mt-2 text-[15px] text-ink-500">Quanto tem de troco na gaveta agora?</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3 text-left">
          <label htmlFor="opening-amount" className="sr-only">
            Troco de abertura em reais
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-display text-xl font-bold text-ink-300">
              R$
            </span>
            <input
              id="opening-amount"
              inputMode="decimal"
              autoFocus
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              placeholder="0,00"
              className="h-16 w-full rounded-2xl border-2 border-surface-border bg-surface pl-14 pr-4 font-display text-2xl font-bold text-ink-900 outline-none transition font-money placeholder:text-ink-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          </div>
          <ErrorMessage>{error}</ErrorMessage>
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Abrindo..." : "Abrir caixa"}
          </Button>
        </form>
      </div>
    </div>
  );
}
