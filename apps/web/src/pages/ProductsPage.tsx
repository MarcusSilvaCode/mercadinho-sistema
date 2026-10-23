import { useEffect, useState } from "react";
import { FileSpreadsheet, Package, Pencil, Plus, ScanLine, Search } from "lucide-react";
import { api } from "../lib/api";
import { formatCurrency } from "../lib/format";
import type { Category, Product, ProductListResponse } from "../lib/types";
import { ProductFormModal } from "../components/products/ProductFormModal";
import { Button, ButtonLink, IconButton } from "../components/ui/Button";
import { Input, Select } from "../components/ui/Field";
import { Badge, EmptyState, PageHeader, Skeleton } from "../components/ui/Layout";
import { Pagination, TableCard, tdClass, thClass, theadRowClass, trClass } from "../components/ui/Table";
import { toast } from "../components/ui/Toast";

const PAGE_SIZE = 20;

function stockTone(p: Product): "danger" | "warning" | "normal" {
  if (p.stockQuantity <= 0) return "danger";
  if (p.stockQuantity <= p.minStockQuantity) return "warning";
  return "normal";
}

const stockText = {
  danger: "font-semibold text-danger-500",
  warning: "font-semibold text-amber-500",
  normal: "text-ink-900",
};

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
    try {
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
    } finally {
      setLoading(false);
    }
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
    toast.success(editing ? "Produto atualizado." : "Produto cadastrado.");
    setModalOpen(false);
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtering = Boolean(search || categoryId || statusFilter);

  return (
    <div>
      <PageHeader
        title="Produtos"
        description={loading && items.length === 0 ? "Carregando..." : `${total} ${total === 1 ? "produto cadastrado" : "produtos cadastrados"}`}
        actions={
          <>
            <ButtonLink to="/produtos/cadastro-rapido">
              <ScanLine size={16} /> Cadastro rápido
            </ButtonLink>
            <ButtonLink to="/produtos/importar">
              <FileSpreadsheet size={16} /> Importar
            </ButtonLink>
            <Button onClick={openCreate}>
              <Plus size={18} /> Novo produto
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_220px_200px]">
        <div className="relative col-span-2 sm:col-span-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <label htmlFor="product-search" className="sr-only">
            Buscar produto
          </label>
          <Input
            id="product-search"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Buscar por nome, código, SKU ou marca"
            className="pl-10"
          />
        </div>
        <Select
          aria-label="Filtrar por categoria"
          value={categoryId}
          onChange={(e) => {
            setPage(1);
            setCategoryId(e.target.value);
          }}
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrar por situação"
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
        >
          <option value="">Ativos e inativos</option>
          <option value="true">Só ativos</option>
          <option value="false">Só inativos</option>
        </Select>
      </div>

      <TableCard footer={<Pagination page={page} totalPages={totalPages} onChange={setPage} />}>
        {loading && items.length === 0 ? (
          <Skeleton rows={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Package}
            title={filtering ? "Nenhum produto encontrado" : "Nenhum produto cadastrado ainda"}
            description={
              filtering
                ? "Tente outro nome ou limpe os filtros."
                : "Cadastre bipando pelo celular ou importe uma planilha."
            }
            action={
              !filtering && (
                <ButtonLink to="/produtos/cadastro-rapido" variant="primary">
                  <ScanLine size={16} /> Começar pelo cadastro rápido
                </ButtonLink>
              )
            }
          />
        ) : (
          <>
            {/* Celular: lista legível com o que importa (nome, preço, estoque) */}
            <ul className="divide-y divide-surface-border md:hidden">
              {items.map((product) => {
                const tone = stockTone(product);
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => openEdit(product)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-surface-muted"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink-900">{product.name}</p>
                        <p className="mt-0.5 truncate text-sm text-ink-500">
                          {product.category.name} · <span className="font-code">{product.barcode}</span>
                        </p>
                        {!product.active && (
                          <div className="mt-1">
                            <Badge>Inativo</Badge>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-display text-lg font-bold text-ink-900 font-money">
                          {formatCurrency(product.salePrice)}
                        </p>
                        <p className={`text-sm font-money ${stockText[tone]}`}>{product.stockQuantity} em estoque</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Computador: tabela completa */}
            <table className="hidden w-full text-[15px] md:table">
              <thead>
                <tr className={theadRowClass}>
                  <th className={thClass}>Produto</th>
                  <th className={thClass}>Categoria</th>
                  <th className={thClass}>Código / SKU</th>
                  <th className={`${thClass} text-right`}>Estoque</th>
                  <th className={`${thClass} text-right`}>Preço</th>
                  <th className={`${thClass} w-16`}>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className={loading ? "opacity-60" : ""}>
                {items.map((product) => {
                  const tone = stockTone(product);
                  return (
                    <tr key={product.id} className={trClass}>
                      <td className={tdClass}>
                        <p className="font-semibold text-ink-900">
                          {product.name}
                          {!product.active && (
                            <span className="ml-2 align-middle">
                              <Badge>Inativo</Badge>
                            </span>
                          )}
                        </p>
                        {product.brand && <p className="text-sm text-ink-500">{product.brand}</p>}
                      </td>
                      <td className={`${tdClass} text-ink-700`}>{product.category.name}</td>
                      <td className={`${tdClass} text-sm text-ink-500`}>
                        <p className="font-code">{product.barcode}</p>
                        <p className="text-xs">{product.sku}</p>
                      </td>
                      <td className={`${tdClass} text-right font-money ${stockText[tone]}`}>
                        {product.stockQuantity}
                        {tone !== "normal" && (
                          <span className="sr-only">{tone === "danger" ? " (sem estoque)" : " (estoque baixo)"}</span>
                        )}
                      </td>
                      <td className={`${tdClass} text-right font-semibold text-ink-900 font-money`}>
                        {formatCurrency(product.salePrice)}
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <IconButton label={`Editar ${product.name}`} onClick={() => openEdit(product)}>
                          <Pencil size={16} />
                        </IconButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </TableCard>

      {modalOpen && (
        <ProductFormModal product={editing} onClose={() => setModalOpen(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}
