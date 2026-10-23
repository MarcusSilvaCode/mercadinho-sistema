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
      <div className="mb-8">
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink-900 md:text-[32px]">Entrada de mercadorias</h1>
        <p className="mt-1 text-[15px] text-ink-500">
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

      <div className="mb-6 rounded-2xl border border-surface-border bg-surface p-4">
        <div className="mb-2 hidden gap-2 px-1 text-xs font-semibold uppercase tracking-[0.06em] text-ink-500 lg:grid lg:grid-cols-[minmax(0,2.4fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(160px,1.1fr)_40px]">
          <span>Produto</span>
          <span>Quantidade</span>
          <span>Custo unitário</span>
          <span>Lote</span>
          <span>Validade</span>
          <span className="sr-only">Remover</span>
        </div>

        <div className="space-y-2">
          {lines.map((line) => (
            <div key={line.key} className="grid grid-cols-2 items-start gap-2 rounded-xl border border-surface-border p-3 lg:border-0 lg:p-0 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(160px,1.1fr)_40px]">
              <div className="relative col-span-2 lg:col-span-1">
                <input
                  value={line.productId ? line.productName : line.productName}
                  onChange={(e) => {
                    updateLine(line.key, { productName: e.target.value, productId: "" });
                    searchProduct(line.key, e.target.value);
                  }}
                  placeholder="Buscar produto pelo nome ou código"
                  aria-label="Produto"
                  className="h-11 w-full min-w-0 rounded-[10px] border border-surface-border bg-surface px-3 text-[15px] text-ink-900 outline-none transition placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                {productQuery[line.key]?.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-surface-border bg-surface py-1 shadow-pop">
                    {productQuery[line.key].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectProduct(line.key, p)}
                        className="block w-full px-3 py-2.5 text-left text-[15px] hover:bg-brand-50"
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
                aria-label="Quantidade"
                className="h-11 w-full min-w-0 rounded-[10px] border border-surface-border bg-surface px-3 text-[15px] text-ink-900 outline-none transition placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 font-money"
              />

              <input
                type="number"
                step="0.01"
                min={0}
                value={line.unitCost}
                onChange={(e) => updateLine(line.key, { unitCost: e.target.value })}
                placeholder="Custo unitário"
                aria-label="Custo unitário"
                className="h-11 w-full min-w-0 rounded-[10px] border border-surface-border bg-surface px-3 text-[15px] text-ink-900 outline-none transition placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 font-money"
              />

              <input
                value={line.batch}
                onChange={(e) => updateLine(line.key, { batch: e.target.value })}
                placeholder="Lote (opcional)"
                aria-label="Lote"
                className="h-11 w-full min-w-0 rounded-[10px] border border-surface-border bg-surface px-3 text-[15px] text-ink-900 outline-none transition placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />

              <input
                type="date"
                aria-label="Validade"
                value={line.expirationDate}
                onChange={(e) => updateLine(line.key, { expirationDate: e.target.value })}
                className="h-11 w-full min-w-0 rounded-[10px] border border-surface-border bg-surface px-3 text-[15px] text-ink-900 outline-none transition placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="button"
                aria-label="Remover linha"
                title="Remover linha"
                onClick={() => removeLine(line.key)}
                className="flex h-11 w-full items-center justify-center rounded-[10px] text-ink-500 hover:bg-danger-50 hover:text-danger-500 lg:w-10"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
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
            className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-brand-500 px-4 h-11 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
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
      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-[0.06em] text-ink-500">
              <th className="px-5 py-3.5">Data</th>
              <th className="px-5 py-3.5">Usuário</th>
              <th className="px-5 py-3.5">Itens</th>
              <th className="px-5 py-3.5 text-right">Total</th>
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
              <tr key={purchase.id} className="border-b border-surface-border last:border-0 transition-colors hover:bg-surface-muted/60">
                <td className="px-5 py-3.5 text-ink-500">{formatDate(purchase.createdAt)}</td>
                <td className="px-5 py-3.5 text-ink-500">{purchase.user.fullName}</td>
                <td className="px-5 py-3.5 text-ink-900">
                  {purchase.items.map((i) => i.product.name).join(", ")}
                </td>
                <td className="px-5 py-3.5 text-right font-money text-ink-900">
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
