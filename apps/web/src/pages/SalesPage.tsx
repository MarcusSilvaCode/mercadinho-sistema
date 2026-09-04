import { FormEvent, useEffect, useState } from "react";
import { Receipt, RotateCcw, X, XCircle } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { formatCurrency, formatDate } from "../lib/format";
import type { SaleDetail, SaleStatus } from "../lib/types";
import { ReturnModal } from "../components/sales/ReturnModal";

const STATUS_LABELS: Record<SaleStatus, string> = {
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
  DEVOLVIDA_PARCIAL: "Devolvida (parcial)",
  DEVOLVIDA_TOTAL: "Devolvida (total)",
};

const STATUS_STYLES: Record<SaleStatus, string> = {
  CONCLUIDA: "bg-brand-50 text-brand-600",
  CANCELADA: "bg-danger-50 text-danger-500",
  DEVOLVIDA_PARCIAL: "bg-amber-50 text-amber-500",
  DEVOLVIDA_TOTAL: "bg-amber-50 text-amber-500",
};

interface SaleListItem {
  id: string;
  number: number;
  status: SaleStatus;
  total: string;
  createdAt: string;
  user: { fullName: string };
}

export function SalesPage() {
  const [items, setItems] = useState<SaleListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [numberFilter, setNumberFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<SaleStatus | "">("");
  const [loading, setLoading] = useState(true);

  const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null);

  const PAGE_SIZE = 20;

  async function load() {
    setLoading(true);
    const { data } = await api.get<{ items: SaleListItem[]; total: number }>("/sales", {
      params: {
        number: numberFilter || undefined,
        status: statusFilter || undefined,
        page,
        pageSize: PAGE_SIZE,
      },
    });
    setItems(data.items);
    setTotal(data.total);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function openSale(id: string) {
    const { data } = await api.get<{ sale: SaleDetail }>(`/sales/${id}`);
    setSelectedSale(data.sale);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-ink-900">Vendas</h1>
        <p className="text-sm text-ink-500">{total} venda(s) — consulte, cancele ou devolva produtos</p>
      </div>

      <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-wrap gap-3">
        <input
          type="number"
          value={numberFilter}
          onChange={(e) => setNumberFilter(e.target.value)}
          placeholder="Buscar por número da venda"
          className="w-56 rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as SaleStatus | "");
          }}
          className="rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-brand-500"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          Buscar
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-card">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-ink-500">
              <th className="px-4 py-3">Nº</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-500">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-500">
                  Nenhuma venda encontrada.
                </td>
              </tr>
            )}
            {items.map((sale) => (
              <tr
                key={sale.id}
                onClick={() => openSale(sale.id)}
                className="cursor-pointer border-b border-surface-border last:border-0 hover:bg-surface-muted"
              >
                <td className="px-4 py-3 font-money text-ink-900">#{sale.number}</td>
                <td className="px-4 py-3 text-ink-500">{formatDate(sale.createdAt)}</td>
                <td className="px-4 py-3 text-ink-500">{sale.user.fullName}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[sale.status]}`}>
                    {STATUS_LABELS[sale.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-money font-medium text-ink-900">
                  {formatCurrency(sale.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-surface-border px-4 py-3 text-sm text-ink-500">
            <span>
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-surface-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-surface-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onChanged={() => {
            load();
            openSale(selectedSale.id);
          }}
        />
      )}
    </div>
  );
}

function SaleDetailModal({
  sale,
  onClose,
  onChanged,
}: {
  sale: SaleDetail;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canCancel = sale.status === "CONCLUIDA";
  const canReturn = sale.status === "CONCLUIDA" || sale.status === "DEVOLVIDA_PARCIAL";

  async function handleCancel(e: FormEvent) {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setError("Informe o motivo do cancelamento.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/sales/${sale.id}/cancel`, { reason: cancelReason });
      setCancelOpen(false);
      onChanged();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-surface-border bg-surface p-6 shadow-card">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink-900">
            <Receipt size={17} /> Venda #{sale.number}
          </h2>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-500">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-sm text-ink-500">
          {formatDate(sale.createdAt)} · {sale.user.fullName} ·{" "}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[sale.status]}`}>
            {STATUS_LABELS[sale.status]}
          </span>
        </p>

        {sale.cancelReason && (
          <div className="mb-4 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">
            Cancelada: {sale.cancelReason}
          </div>
        )}

        <div className="mb-4 space-y-1.5 rounded-lg border border-surface-border p-3 text-sm">
          {sale.items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span className="text-ink-900">
                {item.quantity}x {item.product.name}
                {item.returnedQuantity > 0 && (
                  <span className="ml-1 text-xs text-amber-500">
                    ({item.returnedQuantity} devolvido{item.returnedQuantity > 1 ? "s" : ""})
                  </span>
                )}
              </span>
              <span className="font-money text-ink-500">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-surface-border pt-1.5 font-semibold text-ink-900">
            <span>Total</span>
            <span className="font-money">{formatCurrency(sale.total)}</span>
          </div>
        </div>

        {(canCancel || canReturn) && (
          <div className="mb-2 flex gap-2">
            {canReturn && (
              <button
                onClick={() => setReturnOpen(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-surface-border px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-surface-muted"
              >
                <RotateCcw size={15} /> Devolver produto
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => setCancelOpen(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-danger-500 px-4 py-2.5 text-sm font-medium text-danger-500 transition hover:bg-danger-50"
              >
                <XCircle size={15} /> Cancelar venda
              </button>
            )}
          </div>
        )}

        {cancelOpen && (
          <form onSubmit={handleCancel} className="mt-3 rounded-lg border border-surface-border p-3">
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Motivo do cancelamento</label>
            <input
              autoFocus
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: venda duplicada"
              className="mb-2 w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            {error && <p className="mb-2 text-sm text-danger-500">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                className="flex-1 rounded-lg border border-surface-border px-3 py-2 text-sm text-ink-700 hover:bg-surface-muted"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-danger-500 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Cancelando..." : "Confirmar cancelamento"}
              </button>
            </div>
          </form>
        )}
      </div>

      {returnOpen && (
        <ReturnModal
          sale={sale}
          onClose={() => setReturnOpen(false)}
          onReturned={() => {
            setReturnOpen(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
