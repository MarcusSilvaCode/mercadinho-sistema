import { useEffect, useState } from "react";
import { Plus, Trash2, Truck } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { formatCurrency, formatDate } from "../lib/format";
import type { Product, Purchase, PurchaseLineResult } from "../lib/types";

interface DraftLine {
  key: string;
  productId: string;
  productName: string;
  quantity: string;
  unitCost: string;
  batch: string;
  expirationDate: string;
}

function emptyLine(): DraftLine {
  return {
    key: crypto.randomUUID(),
    productId: "",
    productName: "",
    quantity: "1",
    unitCost: "",
    batch: "",
    expirationDate: "",
  };
}

export function PurchasesPage() {
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [productQuery, setProductQuery] = useState<Record<string, Product[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ lines: PurchaseLineResult[]; total: number } | null>(null);
  const [history, setHistory] = useState<Purchase[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    const { data } = await api.get<{ items: Purchase[] }>("/purchases", { params: { pageSize: 10 } });
    setHistory(data.items);
  }

  async function searchProduct(lineKey: string, query: string) {
    if (query.trim().length < 2) {
      setProductQuery((prev) => ({ ...prev, [lineKey]: [] }));
      return;
    }
    const { data } = await api.get<{ items: Product[] }>("/products", { params: { search: query, pageSize: 8 } });
    setProductQuery((prev) => ({ ...prev, [lineKey]: data.items }));
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function selectProduct(key: string, product: Product) {
    updateLine(key, { productId: product.id, productName: product.name });
    setProductQuery((prev) => ({ ...prev, [key]: [] }));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0);

  async function handleSubmit() {
    setError(null);

    const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0);
    if (validLines.length === 0) {
      setError("Adicione ao menos um produto válido à entrada.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post<{ lines: PurchaseLineResult[]; total: number }>("/purchases", {
        items: validLines.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          unitCost: Number(l.unitCost) || 0,
          batch: l.batch || undefined,
          expirationDate: l.expirationDate || undefined,
        })),
      });
      setResult(data);
      setLines([emptyLine()]);
      loadHistory();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-ink-900">Entrada de mercadorias</h1>
        <p className="text-sm text-ink-500">
          Registre a chegada de produtos — o estoque e o preço de custo são atualizados automaticamente.
        </p>
      </div>

      {result && (
        <div className="mb-6 rounded-2xl border border-brand-100 bg-brand-50 p-4">
          <p className="mb-2 text-sm font-medium text-brand-700">
            Entrada registrada com sucesso — total {formatCurrency(result.total)}
          </p>
          <div className="space-y-1">
            {result.lines.map((line) => (
              <p key={line.productId} className="text-xs text-brand-700">
                {line.productName}: custo {formatCurrency(line.previousCost)} → {formatCurrency(line.unitCost)},
                novo estoque <span className="font-money">{line.newStock}</span>. Preço de venda sugerido:{" "}
                <span className="font-money font-semibold">{formatCurrency(line.suggestedSalePrice)}</span> (aplique
                manualmente em Produtos, se desejar)
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-surface-border bg-surface p-4 shadow-card">
        <div className="overflow-x-auto">
        <div className="min-w-[680px]">
        <div className="mb-3 grid grid-cols-12 gap-2 px-1 text-xs font-medium uppercase tracking-wide text-ink-500">
          <span className="col-span-4">Produto</span>
          <span className="col-span-2">Quantidade</span>
          <span className="col-span-2">Custo unitário</span>
          <span className="col-span-2">Lote</span>
          <span className="col-span-2">Validade</span>
        </div>

        <div className="space-y-2">
          {lines.map((line) => (
            <div key={line.key} className="grid grid-cols-12 items-start gap-2">
              <div className="relative col-span-4">
                <input
                  value={line.productId ? line.productName : line.productName}
                  onChange={(e) => {
                    updateLine(line.key, { productName: e.target.value, productId: "" });
                    searchProduct(line.key, e.target.value);
                  }}
                  placeholder="Buscar produto..."
                  className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                {productQuery[line.key]?.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-surface-border bg-surface shadow-card">
                    {productQuery[line.key].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectProduct(line.key, p)}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-muted"
                      >
                        {p.name} <span className="text-xs text-ink-500">({p.sku})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="number"
                min={1}
                value={line.quantity}
                onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                className="col-span-2 rounded-lg border border-surface-border px-3 py-2 font-money text-sm outline-none focus:border-brand-500"
              />

              <input
                type="number"
                step="0.01"
                min={0}
                value={line.unitCost}
                onChange={(e) => updateLine(line.key, { unitCost: e.target.value })}
                placeholder="0,00"
                className="col-span-2 rounded-lg border border-surface-border px-3 py-2 font-money text-sm outline-none focus:border-brand-500"
              />

              <input
                value={line.batch}
                onChange={(e) => updateLine(line.key, { batch: e.target.value })}
                placeholder="Opcional"
                className="col-span-2 rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-brand-500"
              />

              <div className="col-span-2 flex gap-1">
                <input
                  type="date"
                  value={line.expirationDate}
                  onChange={(e) => updateLine(line.key, { expirationDate: e.target.value })}
                  className="flex-1 rounded-lg border border-surface-border px-2 py-2 text-sm outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => removeLine(line.key)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-danger-50 hover:text-danger-500"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
        </div>
        </div>

        <button
          type="button"
          onClick={addLine}
          className="mt-3 flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <Plus size={15} /> Adicionar linha
        </button>

        <div className="mt-4 flex items-center justify-between border-t border-surface-border pt-4">
          <p className="text-sm text-ink-500">
            Total da entrada: <span className="font-money font-semibold text-ink-900">{formatCurrency(total)}</span>
          </p>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Truck size={16} />
            {submitting ? "Registrando..." : "Registrar entrada"}
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>
        )}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-ink-900">Últimas entradas</h2>
      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-card">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-ink-500">
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Itens</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-500">
                  Nenhuma entrada registrada ainda.
                </td>
              </tr>
            )}
            {history.map((purchase) => (
              <tr key={purchase.id} className="border-b border-surface-border last:border-0">
                <td className="px-4 py-3 text-ink-500">{formatDate(purchase.createdAt)}</td>
                <td className="px-4 py-3 text-ink-500">{purchase.user.fullName}</td>
                <td className="px-4 py-3 text-ink-900">
                  {purchase.items.map((i) => i.product.name).join(", ")}
                </td>
                <td className="px-4 py-3 text-right font-money text-ink-900">
                  {formatCurrency(purchase.totalValue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
