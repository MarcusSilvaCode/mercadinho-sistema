import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { api, getApiErrorMessage } from "../../lib/api";
import type { Category, Product, UnitOfMeasure } from "../../lib/types";
import { UNIT_LABELS } from "../../lib/format";
import { inputClass } from "../ui/Field";

interface ProductFormModalProps {
  product?: Product | null;
  /** Pré-preenche o código de barras — usado pelo fluxo "produto não cadastrado" do PDV (Fase 9) */
  prefilledBarcode?: string;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

const UNITS: UnitOfMeasure[] = ["UN", "CX", "FD", "PCT", "L", "ML", "G", "KG"];

export function ProductFormModal({ product, prefilledBarcode, onClose, onSaved }: ProductFormModalProps) {
  const isEditing = Boolean(product);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [unit, setUnit] = useState<UnitOfMeasure>(product?.unit ?? "UN");
  const [costPrice, setCostPrice] = useState(product?.costPrice ?? "");
  const [salePrice, setSalePrice] = useState(product?.salePrice ?? "");
  const [profitMargin, setProfitMargin] = useState(product?.profitMargin ?? "");
  const [stockQuantity, setStockQuantity] = useState(String(product?.stockQuantity ?? 0));
  const [minStockQuantity, setMinStockQuantity] = useState(String(product?.minStockQuantity ?? 0));
  const [expirationDate, setExpirationDate] = useState(product?.expirationDate?.slice(0, 10) ?? "");
  const [batch, setBatch] = useState(product?.batch ?? "");
  const [barcode, setBarcode] = useState(product?.barcode ?? prefilledBarcode ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<{ categories: Category[] }>("/categories")
      .then(({ data }) => setCategories(data.categories))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setCategoriesLoaded(true));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      name,
      description: description || undefined,
      categoryId,
      brand: brand || undefined,
      unit,
      costPrice: Number(costPrice),
      salePrice: Number(salePrice),
      profitMargin: profitMargin ? Number(profitMargin) : undefined,
      minStockQuantity: Number(minStockQuantity),
      expirationDate: expirationDate || undefined,
      batch: batch || undefined,
      barcode,
      sku: sku || undefined,
      ...(isEditing ? {} : { stockQuantity: Number(stockQuantity) }),
    };

    try {
      const { data } = isEditing
        ? await api.patch<{ product: Product }>(`/products/${product!.id}`, payload)
        : await api.post<{ product: Product }>("/products", payload);
      onSaved(data.product);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-pop sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink-900">
            {isEditing ? "Editar produto" : "Novo produto"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="-mr-2 flex h-9 w-9 items-center justify-center rounded-lg text-ink-300 hover:bg-surface-muted hover:text-ink-700">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <Field label="Nome" className="col-span-2">
            <input className={inputClass} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <Field label="Descrição" className="col-span-2">
            <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          <Field label="Categoria">
            <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Selecione...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {categoriesLoaded && categories.length === 0 && (
              <p className="mt-1.5 text-xs text-ink-500">
                Nenhuma categoria ativa.{" "}
                <Link to="/categorias" className="font-medium text-brand-600 hover:underline">
                  Cadastrar categoria
                </Link>
              </p>
            )}
          </Field>

          <Field label="Marca">
            <input className={inputClass} value={brand} onChange={(e) => setBrand(e.target.value)} />
          </Field>

          <Field label="Código de barras">
            <input className={inputClass} value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          </Field>

          <Field label="SKU (opcional — gerado automaticamente)">
            <input className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Automático" />
          </Field>

          <Field label="Unidade">
            <select className={inputClass} value={unit} onChange={(e) => setUnit(e.target.value as UnitOfMeasure)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABELS[u]} ({u})
                </option>
              ))}
            </select>
          </Field>

          {!isEditing && (
            <Field label="Estoque inicial">
              <input
                type="number"
                className={`${inputClass} font-money`}
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
              />
            </Field>
          )}

          <Field label="Estoque mínimo">
            <input
              type="number"
              className={`${inputClass} font-money`}
              value={minStockQuantity}
              onChange={(e) => setMinStockQuantity(e.target.value)}
            />
          </Field>

          <Field label="Preço de custo">
            <input
              type="number"
              step="0.01"
              className={`${inputClass} font-money`}
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
          </Field>

          <Field label="Preço de venda">
            <input
              type="number"
              step="0.01"
              className={`${inputClass} font-money`}
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
          </Field>

          <Field label="Margem de lucro (%) — em branco usa a margem padrão da loja">
            <input
              type="number"
              step="0.01"
              className={`${inputClass} font-money`}
              value={profitMargin}
              onChange={(e) => setProfitMargin(e.target.value)}
              placeholder="Padrão da loja"
            />
          </Field>

          <Field label="Lote">
            <input className={inputClass} value={batch} onChange={(e) => setBatch(e.target.value)} />
          </Field>

          <Field label="Validade">
            <input
              type="date"
              className={inputClass}
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
            />
          </Field>

          {error && (
            <div className="col-span-2 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>
          )}

          <div className="col-span-2 mt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 flex-1 rounded-[10px] border border-surface-border px-4 h-11 text-sm font-semibold text-ink-900 transition hover:bg-brand-50 hover:border-brand-200 bg-surface"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !name || !categoryId || !barcode}
              className="inline-flex items-center justify-center gap-2 flex-1 rounded-[10px] bg-brand-500 px-4 h-11 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Salvando..." : "Salvar produto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  );
}
