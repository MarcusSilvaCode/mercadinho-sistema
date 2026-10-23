import { FormEvent, useRef, useState } from "react";
import { Minus, Plus, ScanBarcode, Tag, Trash2, Wallet, XCircle } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { formatCurrency } from "../lib/format";
import { useCashierStore } from "../store/cashierStore";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { DiscountModal } from "../components/pdv/DiscountModal";
import { PaymentModal } from "../components/pdv/PaymentModal";
import { ProductFormModal } from "../components/products/ProductFormModal";
import { Button, ButtonLink, IconButton } from "../components/ui/Button";
import { EmptyState } from "../components/ui/Layout";
import { ErrorMessage, Input } from "../components/ui/Field";
import { Modal, ModalActions } from "../components/ui/Modal";
import type { Product, SalePaymentInput, SaleResult } from "../lib/types";

interface CartLine {
  product: Product;
  quantity: number;
}

type Discount = { type: "value" | "percent"; amount: number } | null;

const SHORTCUTS: [string, string][] = [
  ["F2", "Nova venda"],
  ["F3", "Buscar produto"],
  ["F4", "Desconto"],
  ["F5", "Finalizar"],
  ["F6", "Cancelar"],
  ["Esc", "Fechar janela"],
];

export function PDVPage() {
  const { session, fetchCurrent } = useCashierStore();

  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState<Discount>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [noStockProduct, setNoStockProduct] = useState<{ product: Product; needed: number } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  // Último produto lido: fica destacado para o operador conferir sem procurar
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const [discountOpen, setDiscountOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastSale, setLastSale] = useState<SaleResult | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const todayRaw = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const todayLabel = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);

  const subtotal = cart.reduce((sum, line) => sum + line.quantity * Number(line.product.salePrice), 0);
  const discountValue = discount
    ? discount.type === "percent"
      ? subtotal * (discount.amount / 100)
      : discount.amount
    : 0;
  const total = Math.max(0, subtotal - discountValue);
  const itemCount = cart.reduce((sum, l) => sum + l.quantity, 0);

  function focusBarcode() {
    barcodeInputRef.current?.focus();
  }

  function addToCart(product: Product, allowNegativeStock = false) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      const currentQty = existing?.quantity ?? 0;
      const wouldExceed = !allowNegativeStock && currentQty + 1 > product.stockQuantity;

      if (wouldExceed) {
        setNoStockProduct({ product, needed: currentQty + 1 });
        return prev;
      }

      setLastAddedId(product.id);
      if (existing) {
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  async function handleScan(e: FormEvent) {
    e.preventDefault();
    if (!barcode.trim()) return;
    setScanError(null);
    setNotFoundCode(null);
    setLastSale(null);
    const code = barcode.trim();

    try {
      const { data } = await api.get<{ product: Product }>(`/products/barcode/${encodeURIComponent(code)}`);
      if (data.product.stockQuantity <= 0) {
        setNoStockProduct({ product: data.product, needed: 1 });
      } else {
        addToCart(data.product);
      }
    } catch {
      setNotFoundCode(code);
    } finally {
      setBarcode("");
    }
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.product.id === productId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  function handleCancelSale() {
    setCart([]);
    setDiscount(null);
    setLastSale(null);
    setLastAddedId(null);
    focusBarcode();
  }

  async function authorizeNoStock(password: string) {
    if (!noStockProduct) return;
    try {
      await api.post("/auth/verify-password", { password });
      addToCart(noStockProduct.product, true);
      setNoStockProduct(null);
      focusBarcode();
    } catch (err) {
      throw new Error(getApiErrorMessage(err));
    }
  }

  const hasOverriddenStockItems = cart.some((l) => l.quantity > l.product.stockQuantity);

  async function handleConfirmPayment(payments: SalePaymentInput[], receivedAmount?: number) {
    setPaymentError(null);
    setSubmitting(true);
    try {
      const { data } = await api.post<SaleResult>("/sales", {
        items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        discountValue: discount?.type === "value" ? discount.amount : undefined,
        discountPercent: discount?.type === "percent" ? discount.amount : undefined,
        payments,
        receivedAmount,
        stockOverrideConfirmed: hasOverriddenStockItems,
      });
      setLastSale(data);
      setCart([]);
      setDiscount(null);
      setLastAddedId(null);
      setPaymentOpen(false);
      fetchCurrent();
      focusBarcode();
    } catch (err) {
      setPaymentError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  useKeyboardShortcuts(
    {
      onNewSale: handleCancelSale,
      onSearch: focusBarcode,
      onDiscount: () => cart.length > 0 && setDiscountOpen(true),
      onFinish: () => cart.length > 0 && setPaymentOpen(true),
      onCancel: handleCancelSale,
      onEscape: () => {
        setDiscountOpen(false);
        setPaymentOpen(false);
        setNoStockProduct(null);
        setNotFoundCode(null);
      },
    },
    Boolean(session),
  );

  if (!session) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-200 bg-surface">
        <EmptyState
          icon={Wallet}
          title="Caixa fechado"
          description="Abra o caixa com o valor de troco do dia para começar a vender."
          action={
            <ButtonLink to="/caixa" variant="primary" size="lg">
              Abrir o caixa
            </ButtonLink>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink-900 md:text-[32px]">
          Nova venda
        </h1>
        <p className="text-[15px] text-ink-500">{todayLabel}</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* ------ Coluna esquerda: leitor + itens ------ */}
        <section aria-label="Itens da venda" className="flex min-w-0 flex-1 flex-col gap-3">
          <form onSubmit={handleScan} className="relative">
            <label htmlFor="pdv-barcode" className="sr-only">
              Código de barras
            </label>
            <ScanBarcode
              size={22}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-500"
            />
            <input
              id="pdv-barcode"
              ref={barcodeInputRef}
              autoFocus
              autoComplete="off"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Bipe ou digite o código"
              className="h-16 w-full rounded-2xl border-2 border-surface-border bg-surface pl-12 pr-16 text-lg font-medium text-ink-900 outline-none transition placeholder:text-ink-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
            <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-surface-border px-2 py-0.5 text-xs font-semibold text-ink-500 sm:block">
              F3
            </kbd>
          </form>

          {scanError && <ErrorMessage>{scanError}</ErrorMessage>}

          {notFoundCode && (
            <div className="rounded-[10px] bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-500">
              O código <span className="font-code">{notFoundCode}</span> não está cadastrado. Cadastre o produto para
              continuar.
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface">
            {cart.length === 0 ? (
              <EmptyState
                icon={ScanBarcode}
                title="Passe o primeiro produto"
                description="Use o leitor de código de barras ou digite o código no campo acima."
              />
            ) : (
              <ul className="divide-y divide-surface-border">
                {cart.map((line) => {
                  const isLast = line.product.id === lastAddedId;
                  return (
                    <li
                      key={line.product.id}
                      className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors sm:flex-nowrap sm:px-5 ${
                        isLast ? "bg-brand-50" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                        <p className="truncate text-base font-semibold text-ink-900">{line.product.name}</p>
                        <p className="font-money text-sm text-ink-500">
                          {formatCurrency(line.product.salePrice)} / {line.product.unit.toLowerCase()}
                          {line.quantity > line.product.stockQuantity && (
                            <span className="ml-2 font-semibold text-amber-500">· venda sem estoque autorizada</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center rounded-[10px] border border-surface-border bg-surface">
                        <button
                          type="button"
                          aria-label={`Diminuir ${line.product.name}`}
                          onClick={() => updateQuantity(line.product.id, -1)}
                          className="flex h-10 w-10 items-center justify-center rounded-l-[10px] text-ink-500 hover:bg-surface-muted hover:text-ink-900"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-9 text-center font-display text-lg font-bold text-brand-500 font-money">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Aumentar ${line.product.name}`}
                          onClick={() => updateQuantity(line.product.id, 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-r-[10px] text-ink-500 hover:bg-surface-muted hover:text-ink-900"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <p className="ml-auto w-28 text-right font-display text-lg font-bold text-ink-900 font-money">
                        {formatCurrency(line.quantity * Number(line.product.salePrice))}
                      </p>

                      <IconButton
                        label={`Remover ${line.product.name}`}
                        tone="danger"
                        onClick={() => removeLine(line.product.id)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="hidden flex-wrap gap-x-5 gap-y-2 px-1 text-sm text-ink-500 lg:flex">
            {SHORTCUTS.map(([key, label]) => (
              <span key={key} className="flex items-center gap-1.5">
                <kbd className="rounded-md border border-surface-border bg-surface px-1.5 py-0.5 text-xs font-semibold text-ink-700">
                  {key}
                </kbd>
                {label}
              </span>
            ))}
          </div>
        </section>

        {/* ------ Coluna direita: total e pagamento ------ */}
        <aside aria-label="Pagamento" className="w-full shrink-0 lg:sticky lg:top-0 lg:w-[380px]">
          <div className="flex flex-col gap-4 rounded-2xl border-2 border-brand-500 bg-surface p-6">
            {lastSale && (
              <div role="status" className="rounded-xl bg-success-50 px-4 py-3">
                <p className="text-sm font-semibold text-success-500">Venda #{lastSale.sale.number} concluída</p>
                {lastSale.changeAmount !== null && lastSale.changeAmount > 0 && (
                  <p className="mt-0.5 text-sm text-success-500">
                    Troco:{" "}
                    <span className="font-display text-xl font-bold font-money">
                      {formatCurrency(lastSale.changeAmount)}
                    </span>
                  </p>
                )}
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-ink-500">Total da compra</p>
              <p className="mt-1 font-display text-[52px] font-extrabold leading-none tracking-tight text-brand-500 font-money">
                {formatCurrency(total)}
              </p>
            </div>

            <dl className="space-y-1.5 border-t border-surface-border pt-4 text-[15px]">
              <div className="flex justify-between text-ink-500">
                <dt>
                  {itemCount} {itemCount === 1 ? "item" : "itens"}
                </dt>
                <dd className="font-money">{formatCurrency(subtotal)}</dd>
              </div>
              {discount && (
                <div className="flex justify-between font-medium text-brand-600">
                  <dt>Desconto {discount.type === "percent" ? `(${discount.amount}%)` : ""}</dt>
                  <dd className="font-money">− {formatCurrency(discountValue)}</dd>
                </div>
              )}
            </dl>

            <Button
              size="lg"
              className="h-16 w-full text-lg"
              disabled={cart.length === 0}
              onClick={() => cart.length > 0 && setPaymentOpen(true)}
            >
              Finalizar venda
              <kbd className="hidden rounded-md bg-white/15 px-1.5 py-0.5 text-xs font-semibold sm:inline">F5</kbd>
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                disabled={cart.length === 0}
                onClick={() => cart.length > 0 && setDiscountOpen(true)}
              >
                <Tag size={16} /> Desconto
              </Button>
              <Button
                variant="ghost"
                className="text-danger-500 hover:bg-danger-50 hover:text-danger-500"
                disabled={cart.length === 0}
                onClick={handleCancelSale}
              >
                <XCircle size={16} /> Cancelar
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {discountOpen && (
        <DiscountModal
          subtotal={subtotal}
          currentDiscount={discount}
          onClose={() => setDiscountOpen(false)}
          onApply={(d) => {
            setDiscount(d);
            setDiscountOpen(false);
            focusBarcode();
          }}
        />
      )}

      {paymentOpen && (
        <PaymentModal
          total={total}
          submitting={submitting}
          error={paymentError}
          onClose={() => setPaymentOpen(false)}
          onConfirm={handleConfirmPayment}
        />
      )}

      {noStockProduct && (
        <NoStockModal
          productName={noStockProduct.product.name}
          onClose={() => setNoStockProduct(null)}
          onAuthorize={authorizeNoStock}
        />
      )}

      {notFoundCode && (
        <ProductFormModal
          prefilledBarcode={notFoundCode}
          onClose={() => setNotFoundCode(null)}
          onSaved={(product) => {
            setNotFoundCode(null);
            addToCart(product);
          }}
        />
      )}
    </div>
  );
}

function NoStockModal({
  productName,
  onClose,
  onAuthorize,
}: {
  productName: string;
  onClose: () => void;
  onAuthorize: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onAuthorize(password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Produto sem estoque" size="sm" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-[15px] text-ink-700">
          <span className="font-semibold text-ink-900">{productName}</span> está sem estoque suficiente. Um
          administrador precisa autorizar esta venda.
        </p>
        <label htmlFor="no-stock-password" className="sr-only">
          Senha do administrador
        </label>
        <Input
          id="no-stock-password"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha do administrador"
        />
        <ErrorMessage>{error}</ErrorMessage>
        <ModalActions onCancel={onClose} submitLabel="Autorizar venda" submitting={submitting} disabled={!password} />
      </form>
    </Modal>
  );
}
