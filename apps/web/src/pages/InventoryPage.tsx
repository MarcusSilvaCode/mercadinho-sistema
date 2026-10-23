import { FormEvent, useState } from "react";
import { CheckCircle2, ClipboardList, Search } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import type { Inventory, Product } from "../lib/types";

export function InventoryPage() {
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const { data } = await api.post<{ inventory: Inventory }>("/inventory");
      setInventory(data.inventory);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setStarting(false);
    }
  }

  if (!inventory) {
    return (
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border text-center">
        <ClipboardList className="mb-3 text-ink-300" size={32} />
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink-900 md:text-[32px]">Nenhum inventário em andamento</h1>
        <p className="mb-5 mt-2 max-w-sm text-[15px] text-ink-500">
          Inicie um novo inventário para contar os produtos com o leitor de código de barras ou buscando por
          nome/SKU.
        </p>
        {error && <p className="mb-3 text-sm text-danger-500">{error}</p>}
        <button
          onClick={handleStart}
          disabled={starting}
          className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-brand-500 px-4 h-11 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          {starting ? "Iniciando..." : "Novo inventário"}
        </button>
      </div>
    );
  }

  return <InventoryCounting inventory={inventory} onFinished={() => setInventory(null)} />;
}

function InventoryCounting({
  inventory: initialInventory,
  onFinished,
}: {
  inventory: Inventory;
  onFinished: () => void;
}) {
  const [inventory, setInventory] = useState(initialInventory);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [countedQty, setCountedQty] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;

    // Tenta primeiro como código de barras exato (fluxo do leitor USB),
    // depois cai para busca textual por nome/SKU.
    try {
      const { data } = await api.get<{ product: Product }>(`/products/barcode/${encodeURIComponent(search)}`);
      setResults([data.product]);
      setSearch("");
      return;
    } catch {
      // não encontrado por código de barras exato — segue para busca textual
    }

    const { data } = await api.get<{ items: Product[] }>("/products", { params: { search, pageSize: 10 } });
    setResults(data.items);
  }

  async function submitCount(productId: string) {
    const qty = Number(countedQty[productId]);
    if (Number.isNaN(qty) || qty < 0) return;

    const { data } = await api.post<{ item: Inventory["items"][number] }>(
      `/inventory/${inventory.id}/items`,
      { productId, countedQty: qty },
    );

    setInventory((prev) => {
      const existingIndex = prev.items.findIndex((i) => i.productId === productId);
      const items = [...prev.items];
      if (existingIndex >= 0) items[existingIndex] = data.item;
      else items.push(data.item);
      return { ...prev, items };
    });
    setCountedQty((prev) => ({ ...prev, [productId]: "" }));
  }

  async function handleFinish() {
    setError(null);
    setFinishing(true);
    try {
      await api.post(`/inventory/${inventory.id}/finish`);
      onFinished();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink-900 md:text-[32px]">Inventário em andamento</h1>
          <p className="mt-1 text-[15px] text-ink-500">{inventory.items.length} produto(s) contado(s) até agora</p>
        </div>
        <button
          onClick={handleFinish}
          disabled={finishing || inventory.items.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-brand-500 px-4 h-11 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 size={16} />
          {finishing ? "Finalizando..." : "Finalizar inventário"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>
      )}

      <form onSubmit={handleSearch} className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Bipe o código de barras ou digite nome/SKU..."
          className="w-full rounded-[10px] border border-surface-border h-11 pl-9 pr-3 text-[15px] outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-surface placeholder:text-ink-300"
        />
      </form>

      {results.length > 0 && (
        <div className="mb-6 space-y-2">
          {results.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between rounded-lg border border-surface-border px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-ink-900">{product.name}</p>
                <p className="text-xs text-ink-500">
                  Estoque atual: <span className="font-money">{product.stockQuantity}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Contado"
                  value={countedQty[product.id] ?? ""}
                  onChange={(e) => setCountedQty((prev) => ({ ...prev, [product.id]: e.target.value }))}
                  className="w-24 rounded-lg border border-surface-border px-3 py-2 font-money text-sm outline-none focus:border-brand-500"
                />
                <button
                  onClick={() => submitCount(product.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-brand-500 px-3 h-11 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  Registrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-[0.06em] text-ink-500">
              <th className="px-5 py-3.5">Produto</th>
              <th className="px-5 py-3.5 text-right">Esperado</th>
              <th className="px-5 py-3.5 text-right">Contado</th>
              <th className="px-5 py-3.5 text-right">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {inventory.items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-500">
                  Nenhum produto contado ainda — busque acima para começar.
                </td>
              </tr>
            )}
            {inventory.items.map((item) => (
              <tr key={item.id} className="border-b border-surface-border last:border-0 transition-colors hover:bg-surface-muted/60">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-ink-900">{item.product.name}</p>
                  <p className="text-xs text-ink-500">{item.product.sku}</p>
                </td>
                <td className="px-5 py-3.5 text-right font-money text-ink-500">{item.expectedQty}</td>
                <td className="px-5 py-3.5 text-right font-money text-ink-900">{item.countedQty}</td>
                <td className="px-5 py-3.5 text-right">
                  <span
                    className={`font-money font-semibold ${
                      item.difference === 0
                        ? "text-ink-500"
                        : item.difference > 0
                          ? "text-brand-600"
                          : "text-danger-500"
                    }`}
                  >
                    {item.difference > 0 ? "+" : ""}
                    {item.difference}
                  </span>
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
