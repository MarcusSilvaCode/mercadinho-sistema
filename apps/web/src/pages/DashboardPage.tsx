import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  PackageX,
  Receipt,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../lib/api";
import { formatCurrency } from "../lib/format";
import { useAuthStore } from "../store/authStore";
import type { DashboardSummary } from "../lib/types";

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

  if (loading || !summary) {
    return <p className="text-sm text-ink-500">Carregando...</p>;
  }

  const alerts = buildAlertList(summary);
  const paymentChartData =
    summary.caixa.status === "ABERTO"
      ? [
          { name: "Dinheiro", valor: summary.caixa.paymentTotals.DINHEIRO },
          { name: "PIX", valor: summary.caixa.paymentTotals.PIX },
          { name: "Débito", valor: summary.caixa.paymentTotals.DEBITO },
          { name: "Crédito", valor: summary.caixa.paymentTotals.CREDITO },
        ].filter((d) => d.valor > 0)
      : [];

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-ink-900">Olá, {user?.fullName?.split(" ")[0]}</h1>
      <p className="mb-6 text-sm text-ink-500">Aqui está o resumo do mercadinho hoje.</p>

      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.key}
              className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-50 px-3 py-2 text-sm text-amber-500"
            >
              <AlertTriangle size={15} className="shrink-0" />
              <span>{alert.label}</span>
              {alert.to && (
                <Link to={alert.to} className="ml-auto text-xs font-medium underline">
                  Ver
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      <SectionTitle>Hoje</SectionTitle>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Faturamento" value={formatCurrency(summary.today.faturamento)} icon={CircleDollarSign} />
        <StatCard label="Vendas" value={String(summary.today.quantidadeVendas)} icon={ShoppingCart} />
        <StatCard
          label="Lucro estimado"
          value={formatCurrency(summary.today.lucroEstimado)}
          icon={TrendingUp}
          hint="Estimativa, não é lucro contábil"
        />
        <StatCard label="Ticket médio" value={formatCurrency(summary.today.ticketMedio)} icon={Receipt} />
      </div>

      <SectionTitle>Estoque</SectionTitle>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Total de produtos" value={String(summary.estoque.totalProdutos)} icon={Boxes} />
        <StatCard
          label="Estoque baixo"
          value={String(summary.estoque.estoqueBaixo)}
          icon={TrendingDown}
          tone={summary.estoque.estoqueBaixo > 0 ? "amber" : "default"}
          to="/estoque"
        />
        <StatCard
          label="Sem estoque"
          value={String(summary.estoque.semEstoque)}
          icon={PackageX}
          tone={summary.estoque.semEstoque > 0 ? "danger" : "default"}
          to="/estoque"
        />
        <StatCard
          label="Estoque negativo"
          value={String(summary.estoque.estoqueNegativo)}
          icon={PackageX}
          tone={summary.estoque.estoqueNegativo > 0 ? "danger" : "default"}
          to="/estoque"
        />
        <StatCard
          label="Vencendo em breve"
          value={String(summary.estoque.vencendoEmBreve)}
          icon={AlertTriangle}
          tone={summary.estoque.vencendoEmBreve > 0 ? "amber" : "default"}
          to="/estoque"
        />
      </div>

      <SectionTitle>Caixa</SectionTitle>
      <div className="mb-6">
        {summary.caixa.status === "FECHADO" ? (
          <div className="rounded-2xl border border-dashed border-surface-border p-5 text-sm text-ink-500">
            Caixa fechado. <Link to="/caixa" className="font-medium text-brand-600 underline">Abrir caixa</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-surface-border bg-surface p-5 shadow-card md:col-span-1">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-500">
                <Wallet size={13} /> Dinheiro esperado
              </div>
              <p className="font-money text-2xl font-semibold text-ink-900">
                {formatCurrency(summary.caixa.expectedCash)}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                Total vendido hoje: {formatCurrency(summary.caixa.totalSold)}
              </p>
            </div>

            {paymentChartData.length > 0 && (
              <div className="rounded-2xl border border-surface-border bg-surface p-5 shadow-card md:col-span-2">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-500">
                  Vendas por forma de pagamento
                </p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={paymentChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3E7E2" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#5C6B63" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#E3E7E2" }}
                    />
                    <Bar dataKey="valor" fill="#1F6F54" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-3 text-sm font-semibold text-ink-900">{children}</h2>;
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
  to,
}: {
  label: string;
  value: string;
  icon: typeof Boxes;
  tone?: "default" | "amber" | "danger";
  hint?: string;
  to?: string;
}) {
  const toneClasses =
    tone === "danger" ? "text-danger-500" : tone === "amber" ? "text-amber-500" : "text-ink-900";

  const content = (
    <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-card transition hover:border-brand-100">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-500">
        <Icon size={13} />
        {label}
      </div>
      <p className={`font-money text-lg font-semibold ${toneClasses}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-300">{hint}</p>}
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

function buildAlertList(summary: DashboardSummary) {
  const alerts: { key: string; label: string; to?: string }[] = [];

  if (summary.alertas.semEstoque) {
    alerts.push({
      key: "sem-estoque",
      label: `${summary.estoque.semEstoque} produto(s) sem estoque.`,
      to: "/estoque",
    });
  }
  if (summary.alertas.estoqueNegativo) {
    alerts.push({
      key: "negativo",
      label: `${summary.estoque.estoqueNegativo} produto(s) com estoque negativo.`,
      to: "/estoque",
    });
  }
  if (summary.alertas.estoqueBaixo) {
    alerts.push({
      key: "baixo",
      label: `${summary.estoque.estoqueBaixo} produto(s) com estoque baixo.`,
      to: "/estoque",
    });
  }
  if (summary.alertas.produtosVencidos) {
    alerts.push({
      key: "vencidos",
      label: `${summary.estoque.vencidos} produto(s) vencido(s).`,
      to: "/estoque",
    });
  }
  if (summary.alertas.produtosVencendo) {
    alerts.push({
      key: "vencendo",
      label: `${summary.estoque.vencendoEmBreve} produto(s) vencendo em breve.`,
      to: "/estoque",
    });
  }

  return alerts;
}
