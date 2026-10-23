import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatCurrency } from "../lib/format";
import { PeriodSelector } from "../components/reports/PeriodSelector";
import type {
  FinancialReport,
  PaymentBreakdownItem,
  ProductSalesItem,
  ReportPeriod,
  UserSalesItem,
} from "../lib/types";

const TABS = ["Vendas", "Financeiro", "Produtos", "Estoque"] as const;
type Tab = (typeof TABS)[number];

const PAYMENT_LABELS: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  DEBITO: "Débito",
  CREDITO: "Crédito",
};

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>("Financeiro");
  const [period, setPeriod] = useState<ReportPeriod>({ preset: "hoje" });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink-900 md:text-[32px]">Relatórios</h1>
        <p className="mt-1 text-[15px] text-ink-500">Vendas, financeiro, produtos e estoque por período.</p>
      </div>

      <div role="tablist" aria-label="Tipo de relatório" className="mb-5 flex gap-1 overflow-x-auto border-b border-surface-border">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-[15px] font-semibold transition ${
              tab === t ? "border-brand-500 text-brand-600" : "border-transparent text-ink-500 hover:text-ink-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab !== "Estoque" && <PeriodSelector value={period} onChange={setPeriod} />}

      {tab === "Financeiro" && <FinancialTab period={period} />}
      {tab === "Vendas" && <SalesTab period={period} />}
      {tab === "Produtos" && <ProductsTab period={period} />}
      {tab === "Estoque" && <StockTab />}
    </div>
  );
}

function periodParams(period: ReportPeriod) {
  return period.from && period.to
    ? { from: period.from, to: period.to }
    : { preset: period.preset ?? "hoje" };
}

function FinancialTab({ period }: { period: ReportPeriod }) {
  const [report, setReport] = useState<FinancialReport | null>(null);

  useEffect(() => {
    api.get<FinancialReport>("/reports/financial", { params: periodParams(period) }).then(({ data }) => setReport(data));
  }, [period]);

  if (!report) return <p className="text-sm text-ink-500">Carregando...</p>;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      <Metric label="Faturamento bruto" value={formatCurrency(report.faturamentoBruto)} />
      <Metric label="Descontos" value={formatCurrency(report.descontos)} tone={report.descontos > 0 ? "amber" : undefined} />
      <Metric label="Faturamento líquido" value={formatCurrency(report.faturamentoLiquido)} />
      <Metric label="Custo dos produtos vendidos" value={formatCurrency(report.cpv)} />
      <Metric label="Lucro estimado" value={formatCurrency(report.lucroEstimado)} hint="Estimativa, não é lucro contábil" />
      <Metric label="Ticket médio" value={formatCurrency(report.ticketMedio)} />
    </div>
  );
}

function SalesTab({ period }: { period: ReportPeriod }) {
  const [byUser, setByUser] = useState<UserSalesItem[]>([]);
  const [byPayment, setByPayment] = useState<PaymentBreakdownItem[]>([]);

  useEffect(() => {
    api
      .get<{ items: UserSalesItem[] }>("/reports/sales/by-user", { params: periodParams(period) })
      .then(({ data }) => setByUser(data.items));
    api
      .get<{ items: PaymentBreakdownItem[] }>("/reports/sales/by-payment", { params: periodParams(period) })
      .then(({ data }) => setByPayment(data.items));
  }, [period]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        <h2 className="mb-3 text-sm font-semibold text-ink-900">Por usuário</h2>
        <Table
          columns={["Usuário", "Vendas", "Faturamento"]}
          rows={byUser.map((u) => [u.fullName, String(u.quantidadeVendas), formatCurrency(u.faturamento)])}
          empty="Nenhuma venda no período."
        />
      </div>
      <div>
        <h2 className="mb-3 text-sm font-semibold text-ink-900">Por forma de pagamento</h2>
        <Table
          columns={["Forma", "Total"]}
          rows={byPayment.map((p) => [PAYMENT_LABELS[p.method] ?? p.method, formatCurrency(p.total)])}
          empty="Nenhum pagamento no período."
        />
      </div>
    </div>
  );
}

function ProductsTab({ period }: { period: ReportPeriod }) {
  const [mostSold, setMostSold] = useState<ProductSalesItem[]>([]);
  const [mostProfitable, setMostProfitable] = useState<ProductSalesItem[]>([]);

  useEffect(() => {
    api
      .get<{ items: ProductSalesItem[] }>("/reports/products/most-sold", { params: { ...periodParams(period), limit: 10 } })
      .then(({ data }) => setMostSold(data.items));
    api
      .get<{ items: ProductSalesItem[] }>("/reports/products/most-profitable", { params: { ...periodParams(period), limit: 10 } })
      .then(({ data }) => setMostProfitable(data.items));
  }, [period]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        <h2 className="mb-3 text-sm font-semibold text-ink-900">Mais vendidos</h2>
        <Table
          columns={["Produto", "Qtd.", "Faturamento"]}
          rows={mostSold.map((p) => [p.name, String(p.quantidadeVendida), formatCurrency(p.faturamento)])}
          empty="Nenhuma venda no período."
        />
      </div>
      <div>
        <h2 className="mb-3 text-sm font-semibold text-ink-900">Mais lucrativos</h2>
        <Table
          columns={["Produto", "Qtd.", "Lucro estimado"]}
          rows={mostProfitable.map((p) => [p.name, String(p.quantidadeVendida), formatCurrency(p.lucroEstimado)])}
          empty="Nenhuma venda no período."
        />
      </div>
    </div>
  );
}

function StockTab() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StockLink label="Estoque baixo" filter="baixo" />
      <StockLink label="Sem estoque" filter="sem_estoque" />
      <StockLink label="Estoque negativo" filter="negativo" />
      <StockLink label="Vencendo em breve" filter="vencendo" />
      <StockLink label="Vencidos" filter="vencido" />
      <StockLink label="Todos os produtos" filter="" />
    </div>
  );
}

function StockLink({ label, filter }: { label: string; filter: string }) {
  return (
    <Link
      to={filter ? `/estoque?stockStatus=${filter}` : "/estoque"}
      className="rounded-2xl border border-surface-border bg-surface p-4 text-sm font-medium text-ink-700 transition hover:border-brand-100 hover:text-brand-600"
    >
      {label} →
    </Link>
  );
}

function Metric({ label, value, tone, hint }: { label: string; value: string; tone?: "amber"; hint?: string }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-5">
      <p className="text-sm text-ink-500">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold font-money ${tone === "amber" ? "text-amber-500" : "text-ink-900"}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

function Table({ columns, rows, empty }: { columns: string[]; rows: string[][]; empty: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-[15px]">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-[0.06em] text-ink-500">
            {columns.map((c) => (
              <th key={c} className="px-5 py-3.5">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-ink-500">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-surface-border last:border-0 transition-colors hover:bg-surface-muted/60">
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-2.5 ${j > 0 ? "text-right font-money" : "text-ink-900"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
        </div>
    </div>
  );
}
