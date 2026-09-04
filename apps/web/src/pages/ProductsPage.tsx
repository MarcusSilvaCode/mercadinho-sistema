import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileSpreadsheet, Pencil, Plus, Search } from "lucide-react";
import { api } from "../lib/api";
import { formatCurrency } from "../lib/format";
import type { Category, Product, ProductListResponse } from "../lib/types";
import { ProductFormModal } from "../components/products/ProductFormModal";

const PAGE_SIZE = 20;

export function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  useEffect(() => {
    api.get<{ categories: Category[] }>("/categories").then(({ data }) => setCategories(data.categories));
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await api.get<ProductListResponse>("/products", {
      params: {
        search: search || undefined,
        categoryId: categoryId || undefined,
        active: statusFilter === "" ? undefined : statusFilter,
        page,
        pageSize: PAGE_SIZE,
      },
    });
    setItems(data.items);
    setTotal(data.total);
    setLoading(false);
  }

  useEffect(() => {
    const debounce = setTimeout(load, 300); // evita disparar uma requisição por tecla digitada
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId, statusFilter, page]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setModalOpen(true);
  }

  function handleSaved() {
    setModalOpen(false);
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">Produtos</h1>
          <p className="text-sm text-ink-500">{total} produto(s) cadastrado(s)</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/produtos/importar"
            className="flex items-center gap-1.5 rounded-lg border border-surface-border px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-surface-muted"
          >
            <FileSpreadsheet size={15} /> Importar / Exportar
          </Link>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            <Plus size={16} /> Novo produto
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Nome, código de barras, SKU ou marca..."
            className="w-full rounded-lg border border-surface-border py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <select
          value={categoryId}
          onChange={(e) => {
            setPage(1);
            setCategoryId(e.target.value);
          }}
          className="rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-brand-500"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-brand-500"
        >
          <option value="">Todos os status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-card">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-ink-500">
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Código / SKU</th>
              <th className="px-4 py-3 text-right">Estoque</th>
              <th className="px-4 py-3 text-right">Preço</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-500">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-500">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
            {items.map((product) => {
              const stockLow = product.stockQuantity > 0 && product.stockQuantity <= product.minStockQuantity;
              const stockOut = product.stockQuantity === 0;
              const stockNegative = product.stockQuantity < 0;

              return (
                <tr key={product.id} className="border-b border-surface-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{product.name}</p>
                    {product.brand && <p className="text-xs text-ink-500">{product.brand}</p>}
                  </td>
                  <td className="px-4 py-3 text-ink-500">{product.category.name}</td>
                  <td className="px-4 py-3 text-ink-500">
                    <p className="font-money text-xs">{product.barcode}</p>
                    <p className="text-xs">{product.sku}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
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
                  <td className="px-4 py-3 text-right font-money text-ink-900">
                    {formatCurrency(product.salePrice)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        product.active ? "bg-brand-50 text-brand-600" : "bg-surface-muted text-ink-500"
                      }`}
                    >
                      {product.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        onClick={() => openEdit(product)}
                        title="Editar"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-surface-muted hover:text-ink-900"
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
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

      {modalOpen && (
        <ProductFormModal product={editing} onClose={() => setModalOpen(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}
