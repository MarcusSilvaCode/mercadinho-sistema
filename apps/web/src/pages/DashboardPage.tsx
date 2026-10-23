import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ChevronRight, PackageX, ScanBarcode, TrendingDown, Wallet } from "lucide-react";
import { api } from "../lib/api";
import { formatCurrency } from "../lib/format";
import { useAuthStore } from "../store/authStore";
import { ButtonLink } from "../components/ui/Button";
import { PageHeader, Panel, Skeleton } from "../components/ui/Layout";
import type { DashboardSummary } from "../lib/types";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

const PAYMENT_LABELS = [
  ["DINHEIRO", "Dinheiro"],
  ["PIX", "Pix"],
  ["DEBITO", "Débito"],
  ["CREDITO", "Crédito"],
] as const;

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardSummary>("/dashboard/summary")
      .then(({ data }) => setSummary(data))
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.fullName?.split(" ")[0] ?? "";
  const todayRaw = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={today}
        actions={
          <ButtonLink to="/pdv" variant="primary">
            <ScanBarcode size={18} /> Abrir o PDV
          </ButtonLink>
        }
      />

      {loading || !summary ? (
        <Panel padded={false}>
          <Skeleton rows={6} />
        </Panel>
      ) : (
        <DashboardContent summary={summary} />
      )}
    </div>
  );
}

function DashboardContent({ summary }: { summary: DashboardSummary }) {
  const { today, estoque, caixa } = summary;
  const attention = buildAttentionList(summary);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      {/* Vendas de hoje: um número protagonista + métricas de apoio numa faixa */}
      <section aria-label="Vendas de hoje" className="rounded-2xl border border-surface-border bg-surface p-6 md:p-8">
        <p className="text-sm font-semibold text-ink-500">Faturamento de hoje</p>
        <p className="mt-2 font-display text-5xl font-extrabold leading-none tracking-tight text-brand-500 font-money md:text-6xl">
          {formatCurrency(today.faturamento)}
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-surface-border pt-6 sm:grid-cols-3 sm:gap-x-0 sm:divide-x sm:divide-surface-border">
          <Metric label="Vendas" value={String(today.quantidadeVendas)} />
          <Metric label="Ticket médio" value={formatCurrency(today.ticketMedio)} />
          <Metric label="Lucro estimado" value={formatCurrency(today.lucroEstimado)} hint="Estimativa pelo custo cadastrado" wide />
        </dl>
      </section>

      {/* Caixa */}
      <section aria-label="Caixa" className="rounded-2xl border border-surface-border bg-surface p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-ink-900">Caixa</h2>
          <Link to="/caixa" className="text-sm font-semibold text-brand-500 hover:text-brand-600">
            Ver caixa
          </Link>
        </div>

        {caixa.status === "FECHADO" ? (
          <div className="mt-6 flex flex-col items-start gap-3">
            <p className="text-[15px] text-ink-500">O caixa está fechado. Abra para começar a vender.</p>
            <ButtonLink to="/caixa" variant="secondary">
              <Wallet size={16} /> Abrir o caixa
            </ButtonLink>
          </div>
        ) : (
          <>
            <p className="mt-5 text-sm font-semibold text-ink-500">Dinheiro esperado na gaveta</p>
            <p className="mt-1 font-display text-4xl font-bold tracking-tight text-ink-900 font-money">
              {formatCurrency(caixa.expectedCash)}
            </p>

            <h3 className="mt-6 text-sm font-semibold text-ink-700">Vendas por forma de pagamento</h3>
            <PaymentBars totals={caixa.paymentTotals} />
          </>
        )}
      </section>

      {/* Estoque: só o que precisa de atenção */}
      <section aria-label="Estoque" className="rounded-2xl border border-surface-border bg-surface p-6 lg:col-span-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-ink-900">Estoque</h2>
          <span className="text-sm text-ink-500">
            {estoque.totalProdutos} {estoque.totalProdutos === 1 ? "produto ativo" : "produtos ativos"}
          </span>
        </div>

        {attention.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 text-[15px] font-medium text-success-500">
            <CheckCircle2 size={18} /> Nenhum produto precisa de atenção agora.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-surface-border">
            {attention.map((item) => (
              <li key={item.key}>
                <Link
                  to={item.to}
                  className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-surface-muted"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      item.tone === "danger" ? "bg-danger-50 text-danger-500" : "bg-amber-50 text-amber-500"
                    }`}
                  >
                    <item.icon size={18} />
                  </span>
                  <span className="flex-1 text-[15px] text-ink-900">
                    <strong className="font-semibold">{item.count}</strong> {item.label}
                  </span>
                  <ChevronRight size={18} className="text-ink-300 transition group-hover:text-brand-500" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, hint, wide }: { label: string; value: string; hint?: string; wide?: boolean }) {
  return (
    <div className={`sm:px-5 sm:first:pl-0 ${wide ? "col-span-2 sm:col-span-1" : ""}`}>
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className="mt-1 font-display text-xl font-bold text-ink-900 font-money sm:text-2xl">{value}</dd>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

/** Uma série só (valor por forma de pagamento): barras horizontais com o valor escrito ao lado. */
function PaymentBars({ totals }: { totals: Record<string, number> }) {
  const max = Math.max(...PAYMENT_LABELS.map(([k]) => totals[k] ?? 0), 0);

  if (max === 0) {
    return <p className="mt-3 text-sm text-ink-500">Nenhuma venda registrada neste caixa ainda.</p>;
  }

  return (
    <ul className="mt-3 space-y-3">
      {PAYMENT_LABELS.map(([key, label]) => {
        const value = totals[key] ?? 0;
        return (
          <li key={key} className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 text-sm">
            <span className="text-ink-700">{label}</span>
            <span className="h-2.5 rounded-full bg-surface-muted" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-brand-500"
                style={{ width: `${Math.max((value / max) * 100, value > 0 ? 4 : 0)}%` }}
              />
            </span>
            <span className="w-24 text-right font-semibold text-ink-900 font-money">{formatCurrency(value)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function buildAttentionList(summary: DashboardSummary) {
  const { estoque } = summary;
  const items: { key: string; count: number; label: string; to: string; tone: "danger" | "warning"; icon: typeof PackageX }[] = [];
  const add = (key: string, count: number, one: string, many: string, tone: "danger" | "warning", icon: typeof PackageX) => {
    if (count > 0) items.push({ key, count, label: count === 1 ? one : many, to: "/estoque", tone, icon });
  };

  add("negativo", estoque.estoqueNegativo, "produto com estoque negativo", "produtos com estoque negativo", "danger", PackageX);
  add("vencidos", estoque.vencidos, "produto vencido", "produtos vencidos", "danger", AlertTriangle);
  add("sem-estoque", estoque.semEstoque, "produto sem estoque", "produtos sem estoque", "danger", PackageX);
  add("baixo", estoque.estoqueBaixo, "produto com estoque baixo", "produtos com estoque baixo", "warning", TrendingDown);
  add("vencendo", estoque.vencendoEmBreve, "produto vencendo em breve", "produtos vencendo em breve", "warning", AlertTriangle);

  return items;
}
