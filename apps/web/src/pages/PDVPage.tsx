import { FormEvent, useRef, useState } from "react";
import { Minus, Plus, ScanBarcode, Tag, Trash2, X, XCircle } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { formatCurrency } from "../lib/format";
import { useCashierStore } from "../store/cashierStore";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { DiscountModal } from "../components/pdv/DiscountModal";
import { PaymentModal } from "../components/pdv/PaymentModal";
import { ProductFormModal } from "../components/products/ProductFormModal";
import type { Product, SalePaymentInput, SaleResult } from "../lib/types";

interface CartLine {
  product: Product;
  quantity: number;
}

type Discount = { type: "value" | "percent"; amount: number } | null;

export function PDVPage() {
  const { session, fetchCurrent } = useCashierStore();

  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState<Discount>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [noStockProduct, setNoStockProduct] = useState<{ product: Product; needed: number } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [discountOpen, setDiscountOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastSale, setLastSale] = useState<SaleResult | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

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
      setPaymentOpen(false);
      fetchCurrent();
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
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border text-center">
        <ScanBarcode className="mb-3 text-ink-300" size={32} />
        <h1 className="mb-1 text-lg font-semibold text-ink-900">Caixa fechado</h1>
        <p className="max-w-sm text-sm text-ink-500">Abra o caixa para começar a vender no PDV.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 lg:flex-row">
      {/* ------ Coluna esquerda: leitor + carrinho ------ */}
      <div className="flex min-w-0 flex-1 flex-col">
        <form onSubmit={handleScan} className="relative mb-3">
          <ScanBarcode size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500" />
          <input
            ref={barcodeInputRef}
            autoFocus
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Bipe o código de barras ou digite e pressione Enter (F3)"
            className="w-full rounded-xl border-2 border-surface-border bg-surface py-3.5 pl-12 pr-4 text-base font-medium text-ink-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </form>

        {scanError && (
          <div className="mb-3 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{scanError}</div>
        )}

        {notFoundCode && (
          <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-500">
            Produto não cadastrado (código <span className="font-money">{notFoundCode}</span>). Cadastre abaixo ↓
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-card">
          {/* Cabeçalho fixo com contagem de itens */}
          <div className="flex items-center justify-between border-b border-surface-border bg-surface-muted px-4 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Itens do carrinho
            </span>
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-700">
              {itemCount} {itemCount === 1 ? "item" : "itens"}
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <ScanBarcode className="text-ink-300" size={40} strokeWidth={1.5} />
              <p className="text-sm font-medium text-ink-500">Passe o produto pelo leitor</p>
              <p className="text-xs text-ink-300">Ou digite o código de barras no campo acima</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {cart.map((line, i) => (
                <div
                  key={line.product.id}
                  className={`flex items-center gap-3 border-b border-surface-border px-4 py-3 ${
                    i % 2 === 1 ? "bg-surface-muted/50" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{line.product.name}</p>
                    <p className="font-money text-xs text-ink-500">
                      {line.quantity} {line.product.unit} × {formatCurrency(line.product.salePrice)}
                    </p>
                    {line.quantity > line.product.stockQuantity && (
                      <p className="mt-0.5 text-xs font-semibold text-amber-500">Venda sem estoque autorizada</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(line.product.id, -1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-border text-ink-500 transition hover:bg-surface-muted"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-7 text-center font-money text-sm font-semibold text-ink-900">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(line.product.id, 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-border text-ink-500 transition hover:bg-surface-muted"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  <p className="w-24 shrink-0 text-right font-money text-base font-bold text-ink-900">
                    {formatCurrency(line.quantity * Number(line.product.salePrice))}
                  </p>

                  <button
                    onClick={() => removeLine(line.product.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-danger-50 hover:text-danger-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ------ Coluna direita: totais + ações ------ */}
      <div className="w-full shrink-0 lg:w-96">
        <div className="sticky top-0 flex flex-col gap-3">
          {lastSale && (
            <div className="rounded-2xl border-2 border-brand-500 bg-brand-50 p-4">
              <p className="text-sm font-bold text-brand-700">Venda #{lastSale.sale.number} concluída!</p>
              {lastSale.changeAmount !== null && lastSale.changeAmount > 0 && (
                <p className="mt-1 text-sm text-brand-700">
                  Troco: <span className="font-money text-base font-bold">{formatCurrency(lastSale.changeAmount)}</span>
                </p>
              )}
            </div>
          )}

          {/* Bloco de totais — o elemento mais visível da tela */}
          <div className="rounded-2xl border border-surface-border bg-surface p-5 shadow-card">
            <div className="mb-3 space-y-1.5">
              <div className="flex justify-between text-sm text-ink-500">
                <span>Subtotal</span>
                <span className="font-money">{formatCurrency(subtotal)}</span>
              </div>
              {discount && (
                <div className="flex justify-between text-sm font-medium text-brand-600">
                  <span>Desconto {discount.type === "percent" ? `(${discount.amount}%)` : ""}</span>
                  <span className="font-money">-{formatCurrency(discountValue)}</span>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-ink-900 px-4 py-4">
              <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-white/60">Total</p>
              <p className="font-money text-4xl font-extrabold text-white">{formatCurrency(total)}</p>
            </div>
          </div>

          {/* Ações — só o botão de finalizar tem cor de destaque, o resto é neutro */}
          <div className="space-y-2">
            <button
              onClick={() => cart.length > 0 && setPaymentOpen(true)}
              disabled={cart.length === 0}
              className="w-full rounded-xl bg-brand-500 px-4 py-4 text-base font-bold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Finalizar venda (F5)
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => cart.length > 0 && setDiscountOpen(true)}
                disabled={cart.length === 0}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm font-semibold text-ink-700 transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Tag size={15} /> Desconto (F4)
              </button>
              <button
                onClick={handleCancelSale}
                disabled={cart.length === 0}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-danger-500 px-4 py-3 text-sm font-semibold text-danger-500 transition hover:bg-danger-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <XCircle size={15} /> Cancelar (F6)
              </button>
            </div>
          </div>
        </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-surface p-6 shadow-card">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">Produto sem estoque</h2>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-500">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-sm text-ink-500">
          <span className="font-medium text-ink-900">{productName}</span> está sem estoque suficiente. Um
          administrador precisa autorizar esta venda.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha do administrador"
            className="mb-3 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />

          {error && (
            <div className="mb-3 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-surface-border px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-surface-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !password}
              className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Autorizando..." : "Autorizar venda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
