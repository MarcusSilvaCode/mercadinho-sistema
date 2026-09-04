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
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-ink-900">Relatórios</h1>
        <p className="text-sm text-ink-500">Vendas, financeiro, produtos e estoque por período.</p>
      </div>

      <div className="mb-4 flex gap-1 border-b border-surface-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
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
      <Metric label="Descontos" value={formatCurrency(report.descontos)} tone="amber" />
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
      className="rounded-2xl border border-surface-border bg-surface p-4 text-sm font-medium text-ink-700 shadow-card transition hover:border-brand-100 hover:text-brand-600"
    >
      {label} →
    </Link>
  );
}

function Metric({ label, value, tone, hint }: { label: string; value: string; tone?: "amber"; hint?: string }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-card">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`font-money text-lg font-semibold ${tone === "amber" ? "text-amber-500" : "text-ink-900"}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-ink-300">{hint}</p>}
    </div>
  );
}

function Table({ columns, rows, empty }: { columns: string[]; rows: string[][]; empty: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-ink-500">
            {columns.map((c) => (
              <th key={c} className="px-4 py-3">
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
            <tr key={i} className="border-b border-surface-border last:border-0">
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
