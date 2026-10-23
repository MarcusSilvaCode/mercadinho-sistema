import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, History } from "lucide-react";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import type { Category, Product, ProductListResponse, StockMovement } from "../lib/types";
import { StockAdjustModal } from "../components/stock/StockAdjustModal";
import { Pagination } from "../components/ui/Table";

const PAGE_SIZE = 20;

type StockStatus = "" | "baixo" | "sem_estoque" | "negativo" | "vencendo" | "vencido";

const STATUS_LABELS: Record<Exclude<StockStatus, "">, string> = {
  baixo: "Estoque baixo",
  sem_estoque: "Sem estoque",
  negativo: "Estoque negativo",
  vencendo: "Vencendo em breve",
  vencido: "Vencidos",
};

export function StockPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [searchParams] = useSearchParams();
  const [stockStatus, setStockStatus] = useState<StockStatus>(
    (searchParams.get("stockStatus") as StockStatus) || "",
  );
  const [categories, setCategories] = useState<Category[]>([]);

  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  useEffect(() => {
    api.get<{ categories: Category[] }>("/categories").then(({ data }) => setCategories(data.categories));
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await api.get<ProductListResponse>("/products", {
      params: {
        search: search || undefined,
        categoryId: categoryId || undefined,
        stockStatus: stockStatus || undefined,
        page,
        pageSize: PAGE_SIZE,
      },
    });
    setItems(data.items);
    setTotal(data.total);
    setLoading(false);
  }

  useEffect(() => {
    const debounce = setTimeout(load, 300);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId, stockStatus, page]);

  function handleAdjusted() {
    setAdjusting(null);
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink-900 md:text-[32px]">Estoque</h1>
        <p className="mt-1 text-[15px] text-ink-500">{total} produto(s) — ajuste manual e histórico de movimentações</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Nome, código de barras, SKU ou marca..."
          className="min-w-[240px] flex-1 rounded-[10px] border border-surface-border px-3 h-11 text-[15px] outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-surface placeholder:text-ink-300"
        />

        <select
          value={categoryId}
          onChange={(e) => {
            setPage(1);
            setCategoryId(e.target.value);
          }}
          className="h-11 cursor-pointer rounded-[10px] border border-surface-border bg-surface px-3 text-[15px] text-ink-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={stockStatus}
          onChange={(e) => {
            setPage(1);
            setStockStatus(e.target.value as StockStatus);
          }}
          className="h-11 cursor-pointer rounded-[10px] border border-surface-border bg-surface px-3 text-[15px] text-ink-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          <option value="">Todos os status de estoque</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-[0.06em] text-ink-500">
              <th className="px-5 py-3.5">Produto</th>
              <th className="px-5 py-3.5">Categoria</th>
              <th className="px-5 py-3.5 text-right">Estoque atual</th>
              <th className="px-5 py-3.5 text-right">Estoque mínimo</th>
              <th className="px-5 py-3.5">Validade</th>
              <th className="px-5 py-3.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-500">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-500">
                  Nenhum produto encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
            {items.map((product) => {
              const stockLow = product.stockQuantity > 0 && product.stockQuantity <= product.minStockQuantity;
              const stockOut = product.stockQuantity === 0;
              const stockNegative = product.stockQuantity < 0;
              const expired = product.expirationDate && new Date(product.expirationDate) < new Date();

              return (
                <tr key={product.id} className="border-b border-surface-border last:border-0 transition-colors hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-ink-900">{product.name}</p>
                    <p className="text-xs text-ink-500">{product.sku}</p>
                  </td>
                  <td className="px-5 py-3.5 text-ink-500">{product.category.name}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={`font-money text-sm ${
                        stockNegative
                          ? "font-semibold text-danger-500"
                          : stockOut
                            ? "text-danger-500"
                            : stockLow
                              ? "font-semibold text-amber-500"
                              : "text-ink-900"
                      }`}
                    >
                      {product.stockQuantity}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-money text-ink-500">{product.minStockQuantity}</td>
                  <td className="px-5 py-3.5">
                    {product.expirationDate ? (
                      <span className={`text-xs ${expired ? "font-semibold text-danger-500" : "text-ink-500"}`}>
                        {formatDate(product.expirationDate)}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setHistoryProduct(product)}
                        title="Histórico de movimentações"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-brand-50 hover:text-brand-600"
                      >
                        <History size={15} />
                      </button>
                      <button
                        onClick={() => setAdjusting(product)}
                        title="Ajustar estoque"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-brand-50 hover:text-brand-600"
                      >
                        <SlidersHorizontal size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      {adjusting && (
        <StockAdjustModal product={adjusting} onClose={() => setAdjusting(null)} onSaved={handleAdjusted} />
      )}

      {historyProduct && (
        <MovementHistoryModal product={historyProduct} onClose={() => setHistoryProduct(null)} />
      )}
    </div>
  );
}

const MOVEMENT_LABELS: Record<string, string> = {
  ENTRADA: "Entrada",
  VENDA: "Venda",
  CANCELAMENTO: "Cancelamento",
  DEVOLUCAO: "Devolução",
  AJUSTE: "Ajuste manual",
  INVENTARIO: "Inventário",
};

function MovementHistoryModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ items: StockMovement[] }>("/stock/movements", { params: { productId: product.id, pageSize: 50 } })
      .then(({ data }) => setMovements(data.items))
      .finally(() => setLoading(false));
  }, [product.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-pop sm:rounded-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink-900">Histórico de movimentações</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="-mr-2 flex h-9 w-9 items-center justify-center rounded-lg text-ink-300 hover:bg-surface-muted hover:text-ink-700">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-ink-500">{product.name}</p>

        {loading && <p className="py-6 text-center text-sm text-ink-500">Carregando...</p>}
        {!loading && movements.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-500">Nenhuma movimentação registrada.</p>
        )}

        <div className="space-y-2">
          {movements.map((m) => (
            <div key={m.id} className="rounded-lg border border-surface-border px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink-900">{MOVEMENT_LABELS[m.type] ?? m.type}</span>
                <span className={`font-money font-semibold ${m.quantity < 0 ? "text-danger-500" : "text-brand-600"}`}>
                  {m.quantity > 0 ? "+" : ""}
                  {m.quantity}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between text-xs text-ink-500">
                <span>
                  {m.previousStock} → {m.newStock} {m.reason && `· ${m.reason}`}
                </span>
                <span>
                  {formatDate(m.createdAt)} · {m.user.fullName}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
