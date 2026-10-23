import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Check, Keyboard, Plus } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import type { Category, Product, StoreSettings, UnitOfMeasure } from "../lib/types";
import { UNIT_LABELS, formatCurrency } from "../lib/format";
import { parseMoneyInput, suggestSalePrice } from "../lib/pricing";
import { BarcodeScanner } from "../components/products/BarcodeScanner";
import { Modal, ModalActions } from "../components/ui/Modal";
import { ErrorMessage, Input } from "../components/ui/Field";

/**
 * Cadastro rápido pelo celular: bipa com a câmera → confere/preenche → salva → próximo.
 * Produto novo: nome e marca vêm pré-preenchidos da base pública quando encontrados.
 * Produto já cadastrado: permite corrigir preços e somar a quantidade contada ao estoque.
 */

type Step =
  | { kind: "scan" }
  | { kind: "loading"; barcode: string }
  | { kind: "new"; barcode: string; suggestedName?: string; suggestedBrand?: string }
  | { kind: "existing"; product: Product };

interface SavedItem {
  id: string;
  name: string;
  salePrice: number;
  isNew: boolean;
}

const UNITS: UnitOfMeasure[] = ["UN", "CX", "FD", "PCT", "L", "ML", "G", "KG"];
const LAST_CATEGORY_KEY = "cadastro-rapido:ultima-categoria";

function readLastCategory(): string {
  try {
    return localStorage.getItem(LAST_CATEGORY_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveLastCategory(id: string) {
  try {
    localStorage.setItem(LAST_CATEGORY_KEY, id);
  } catch {
    // modo privado / armazenamento bloqueado — só perde a conveniência
  }
}

export function QuickRegisterPage() {
  const [step, setStep] = useState<Step>({ kind: "scan" });
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [defaultMargin, setDefaultMargin] = useState(30);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ categories: Category[] }>("/categories").then(({ data }) => setCategories(data.categories));
    api
      .get<{ settings: StoreSettings }>("/settings")
      .then(({ data }) => setDefaultMargin(Number(data.settings.defaultMargin)))
      .catch(() => undefined); // sem margem da loja, fica a padrão de 30%
  }, []);

  async function handleCode(raw: string) {
    const barcode = raw.trim();
    if (!barcode) return;
    setError(null);
    setStep({ kind: "loading", barcode });

    try {
      const { data } = await api.get<{ product: Product }>(`/products/barcode/${encodeURIComponent(barcode)}`);
      setStep({ kind: "existing", product: data.product });
      return;
    } catch (err) {
      if (!(axios.isAxiosError(err) && err.response?.status === 404)) {
        setError(getApiErrorMessage(err));
        setStep({ kind: "scan" });
        return;
      }
    }

    let suggestion: { found: boolean; name?: string; brand?: string } = { found: false };
    if (/^\d{8,14}$/.test(barcode)) {
      suggestion = await api
        .get<typeof suggestion>(`/products/lookup/${barcode}`)
        .then(({ data }) => data)
        .catch(() => ({ found: false }));
    }
    setStep({ kind: "new", barcode, suggestedName: suggestion.name, suggestedBrand: suggestion.brand });
  }

  function handleSaved(item: SavedItem) {
    setSaved((prev) => [item, ...prev].slice(0, 20));
    setManualCode("");
    setStep({ kind: "scan" });
  }

  return (
    <div className="mx-auto max-w-md space-y-4 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink-900 md:text-[32px]">Cadastro rápido</h1>
          <p className="mt-1 text-[15px] text-ink-500">
            {saved.length === 0
              ? "Aponte a câmera para o código de barras."
              : `${saved.length} produto${saved.length > 1 ? "s" : ""} salvo${saved.length > 1 ? "s" : ""} nesta sessão`}
          </p>
        </div>
        <Link to="/produtos" className="shrink-0 whitespace-nowrap text-sm font-medium text-brand-600">
          Ver produtos
        </Link>
      </div>

      {error && <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>}

      {step.kind === "scan" && (
        <>
          <BarcodeScanner onDetected={handleCode} />

          {manualOpen ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCode(manualCode);
              }}
              className="flex gap-2"
            >
              <input
                autoFocus
                inputMode="numeric"
                className={inputClass}
                placeholder="Digite o código de barras"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-brand-500 px-4 text-sm font-semibold text-white">
                OK
              </button>
            </form>
          ) : (
            <button
              onClick={() => setManualOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface py-3 text-sm font-medium text-ink-700"
            >
              <Keyboard size={16} /> Digitar código
            </button>
          )}

          {saved.length > 0 && (
            <div className="rounded-2xl border border-surface-border bg-surface p-4">
              <h2 className="mb-2 text-sm font-semibold text-ink-900">Últimos salvos</h2>
              <ul className="divide-y divide-surface-border text-sm">
                {saved.map((item, i) => (
                  <li key={`${item.id}-${i}`} className="flex items-center justify-between gap-2 py-2">
                    <span className="truncate text-ink-700">
                      {item.name}
                      {!item.isNew && <span className="ml-1 text-xs text-ink-300">(atualizado)</span>}
                    </span>
                    <span className="shrink-0 font-money text-ink-900">{formatCurrency(item.salePrice)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {step.kind === "loading" && (
        <div className="rounded-2xl border border-surface-border bg-surface p-8 text-center text-sm text-ink-500">
          Buscando <span className="font-money">{step.barcode}</span>...
        </div>
      )}

      {step.kind === "new" && (
        <NewProductForm
          key={step.barcode}
          barcode={step.barcode}
          suggestedName={step.suggestedName}
          suggestedBrand={step.suggestedBrand}
          categories={categories}
          onCategoryCreated={(c) => setCategories((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)))}
          defaultMargin={defaultMargin}
          onCancel={() => setStep({ kind: "scan" })}
          onSaved={handleSaved}
        />
      )}

      {step.kind === "existing" && (
        <ExistingProductForm
          key={step.product.id}
          product={step.product}
          onCancel={() => setStep({ kind: "scan" })}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

interface NewProductFormProps {
  barcode: string;
  suggestedName?: string;
  suggestedBrand?: string;
  categories: Category[];
  onCategoryCreated: (category: Category) => void;
  defaultMargin: number;
  onCancel: () => void;
  onSaved: (item: SavedItem) => void;
}

function NewProductForm({
  barcode,
  suggestedName,
  suggestedBrand,
  categories,
  onCategoryCreated,
  defaultMargin,
  onCancel,
  onSaved,
}: NewProductFormProps) {
  const [name, setName] = useState(suggestedName ?? "");
  const [brand, setBrand] = useState(suggestedBrand ?? "");
  const [categoryId, setCategoryId] = useState(readLastCategory);
  const [unit, setUnit] = useState<UnitOfMeasure>("UN");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [saleEdited, setSaleEdited] = useState(false);
  const [stockQuantity, setStockQuantity] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const costRef = useRef<HTMLInputElement>(null);

  // A categoria lembrada pode ter sido inativada — só vale se ainda está na lista
  const validCategoryId = categories.some((c) => c.id === categoryId) ? categoryId : "";

  useEffect(() => {
    // Nome já veio da base pública: o próximo campo útil é o custo
    if (suggestedName) costRef.current?.focus();
  }, [suggestedName]);

  function handleCostChange(value: string) {
    setCostPrice(value);
    const cost = parseMoneyInput(value);
    if (!saleEdited && !Number.isNaN(cost)) {
      setSalePrice(suggestSalePrice(cost, defaultMargin).toFixed(2).replace(".", ","));
    }
  }

  const [newCategoryOpen, setNewCategoryOpen] = useState(false);

  function handleCategoryCreated(category: Category) {
    onCategoryCreated(category);
    setCategoryId(category.id);
    setNewCategoryOpen(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const cost = parseMoneyInput(costPrice);
    const sale = parseMoneyInput(salePrice);
    const stock = stockQuantity ? Number(stockQuantity) : 0;
    if (Number.isNaN(cost) || Number.isNaN(sale)) {
      setError("Informe o preço de custo e o de venda.");
      return;
    }
    if (!Number.isInteger(stock)) {
      setError("O estoque deve ser um número inteiro.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post<{ product: Product }>("/products", {
        name: name.trim(),
        brand: brand.trim() || undefined,
        categoryId: validCategoryId,
        unit,
        costPrice: cost,
        salePrice: sale,
        stockQuantity: stock,
        expirationDate: expirationDate || undefined,
        barcode,
      });
      saveLastCategory(validCategoryId);
      onSaved({ id: data.product.id, name: data.product.name, salePrice: sale, isNew: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-surface-border bg-surface p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-brand-600">Produto novo</p>
        <p className="font-money text-sm text-ink-500">{barcode}</p>
        {!suggestedName && (
          <p className="mt-1 text-xs text-ink-500">Não encontrado na base pública — digite o nome.</p>
        )}
      </div>

      <Field label="Nome">
        <input
          autoFocus={!suggestedName}
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Marca (opcional)">
        <input className={inputClass} value={brand} onChange={(e) => setBrand(e.target.value)} />
      </Field>

      <Field label="Categoria">
        <div className="flex gap-2">
          <select className={inputClass} value={validCategoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Selecione...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setNewCategoryOpen(true)}
            title="Nova categoria"
            className="flex shrink-0 items-center gap-1 rounded-lg border border-surface-border px-3 text-sm font-medium text-ink-700"
          >
            <Plus size={16} /> Nova
          </button>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Custo (R$)">
          <input
            ref={costRef}
            inputMode="decimal"
            className={`${inputClass} font-money`}
            placeholder="0,00"
            value={costPrice}
            onChange={(e) => handleCostChange(e.target.value)}
          />
        </Field>
        <Field label="Venda (R$)">
          <input
            inputMode="decimal"
            className={`${inputClass} font-money`}
            placeholder="0,00"
            value={salePrice}
            onChange={(e) => {
              setSaleEdited(true);
              setSalePrice(e.target.value);
            }}
          />
        </Field>
      </div>
      {!saleEdited && (
        <p className="-mt-2 text-xs text-ink-500">Venda sugerida com a margem padrão da loja ({defaultMargin}%).</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Estoque atual">
          <input
            inputMode="numeric"
            className={`${inputClass} font-money`}
            placeholder="0"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value.replace(/\D/g, ""))}
          />
        </Field>
        <Field label="Unidade">
          <select className={inputClass} value={unit} onChange={(e) => setUnit(e.target.value as UnitOfMeasure)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABELS[u]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Validade (opcional)">
        <input
          type="date"
          className={inputClass}
          value={expirationDate}
          onChange={(e) => setExpirationDate(e.target.value)}
        />
      </Field>

      {error && <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>}

      <FormActions
        onCancel={onCancel}
        submitting={submitting}
        disabled={name.trim().length < 2 || !validCategoryId || !costPrice || !salePrice}
      />
      {newCategoryOpen && (
        <NewCategoryModal onClose={() => setNewCategoryOpen(false)} onCreated={handleCategoryCreated} />
      )}
    </form>
  );
}

interface ExistingProductFormProps {
  product: Product;
  onCancel: () => void;
  onSaved: (item: SavedItem) => void;
}

function ExistingProductForm({ product, onCancel, onSaved }: ExistingProductFormProps) {
  const [costPrice, setCostPrice] = useState(Number(product.costPrice).toFixed(2).replace(".", ","));
  const [salePrice, setSalePrice] = useState(Number(product.salePrice).toFixed(2).replace(".", ","));
  const [addQuantity, setAddQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const cost = parseMoneyInput(costPrice);
    const sale = parseMoneyInput(salePrice);
    if (Number.isNaN(cost) || Number.isNaN(sale)) {
      setError("Informe preços válidos.");
      return;
    }
    const qty = addQuantity ? Number(addQuantity) : 0;

    setSubmitting(true);
    try {
      const priceChanged = cost !== Number(product.costPrice) || sale !== Number(product.salePrice);
      if (priceChanged) {
        await api.patch(`/products/${product.id}`, { costPrice: cost, salePrice: sale });
      }
      if (qty > 0) {
        await api.post("/stock/adjust", {
          productId: product.id,
          quantity: qty,
          reason: "Contagem no cadastro rápido",
        });
      }
      onSaved({ id: product.id, name: product.name, salePrice: sale, isNew: false });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-surface-border bg-surface p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-amber-500">Já cadastrado</p>
        <p className="text-base font-semibold text-ink-900">{product.name}</p>
        <p className="text-sm text-ink-500">
          {product.category.name} · estoque atual: <span className="font-money">{product.stockQuantity}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Custo (R$)">
          <input
            inputMode="decimal"
            className={`${inputClass} font-money`}
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
          />
        </Field>
        <Field label="Venda (R$)">
          <input
            inputMode="decimal"
            className={`${inputClass} font-money`}
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Somar ao estoque (opcional)">
        <input
          inputMode="numeric"
          className={`${inputClass} font-money`}
          placeholder="0"
          value={addQuantity}
          onChange={(e) => setAddQuantity(e.target.value.replace(/\D/g, ""))}
        />
      </Field>

      {error && <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>}

      <FormActions onCancel={onCancel} submitting={submitting} disabled={!costPrice || !salePrice} />
    </form>
  );
}

function FormActions({
  onCancel,
  submitting,
  disabled,
}: {
  onCancel: () => void;
  submitting: boolean;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center justify-center gap-1 rounded-lg border border-surface-border px-4 py-3.5 text-sm font-medium text-ink-700"
      >
        <ArrowLeft size={16} /> Voltar
      </button>
      <button
        type="submit"
        disabled={submitting || disabled}
        className="inline-flex items-center justify-center gap-2 flex-1 rounded-[10px] bg-brand-500 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Check size={18} /> {submitting ? "Salvando..." : "Salvar e próximo"}
      </button>
    </div>
  );
}

const inputClass =
  "h-12 w-full rounded-[10px] border border-surface-border bg-surface px-3 text-base text-ink-900 outline-none transition placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  );
}

function NewCategoryModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Category) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    e.stopPropagation(); // não enviar o formulário do produto que está por trás
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await api.post<{ category: Category }>("/categories", { name: name.trim() });
      onCreated(data.category);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Nova categoria" size="sm" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="new-category-name" className="sr-only">
          Nome da categoria
        </label>
        <Input
          id="new-category-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Bebidas, Padaria, Limpeza"
        />
        <ErrorMessage>{error}</ErrorMessage>
        <ModalActions onCancel={onClose} submitLabel="Criar categoria" submitting={submitting} disabled={name.trim().length < 2} />
      </form>
    </Modal>
  );
}
