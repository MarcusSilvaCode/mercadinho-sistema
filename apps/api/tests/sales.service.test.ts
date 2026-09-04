import { describe, it, expect, vi, beforeEach } from "vitest";

const txMock = {
  product: { findUnique: vi.fn(), update: vi.fn() },
  sale: { create: vi.fn() },
  saleItem: { create: vi.fn() },
  stockMovement: { create: vi.fn() },
  payment: { create: vi.fn() },
};

const prismaMock = {
  cashierSession: { findFirst: vi.fn() },
  storeSettings: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(async (cb: (tx: typeof txMock) => unknown) => cb(txMock)),
};

vi.mock("../src/config/prisma.js", () => ({ prisma: prismaMock }));

const { createSale } = await import("../src/modules/sales/sales.service.js");
const { AppError } = await import("../src/shared/AppError.js");

const OPEN_SESSION = { id: "session-1", status: "ABERTO" };

const PRODUCT_A = {
  id: "prod-a",
  name: "Arroz 5kg",
  active: true,
  salePrice: 25,
  costPrice: 20,
  stockQuantity: 10,
};

const PRODUCT_B = {
  id: "prod-b",
  name: "Feijão 1kg",
  active: true,
  salePrice: 8,
  costPrice: 5,
  stockQuantity: 5,
};

function productLookup(map: Record<string, unknown>) {
  return ({ where }: { where: { id: string } }) => Promise.resolve(map[where.id] ?? null);
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.cashierSession.findFirst.mockResolvedValue(OPEN_SESSION);
  prismaMock.storeSettings.findUnique.mockResolvedValue({ maxDiscountPercent: 30 });
  prismaMock.auditLog.create.mockResolvedValue({});
  txMock.sale.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve({ id: "sale-1", ...data }),
  );
  txMock.saleItem.create.mockResolvedValue({});
  txMock.stockMovement.create.mockResolvedValue({});
  txMock.payment.create.mockResolvedValue({});
  txMock.product.update.mockResolvedValue({});
});

describe("sales.service — createSale", () => {
  it("rejeita venda sem caixa aberto", async () => {
    prismaMock.cashierSession.findFirst.mockResolvedValue(null);

    await expect(
      createSale(
        {
          items: [{ productId: "prod-a", quantity: 1 }],
          payments: [{ method: "DINHEIRO", amount: 25 }],
          stockOverrideConfirmed: false,
        } as never,
        "user-1",
      ),
    ).rejects.toThrow("Não há caixa aberto. Abra o caixa antes de iniciar uma venda.");
  });

  it("congela preço e custo do produto no momento da venda", async () => {
    txMock.product.findUnique.mockImplementation(productLookup({ "prod-a": PRODUCT_A }));

    await createSale(
      {
        items: [{ productId: "prod-a", quantity: 2 }],
        payments: [{ method: "DINHEIRO", amount: 50 }],
        stockOverrideConfirmed: false,
      } as never,
      "user-1",
    );

    expect(txMock.saleItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unitPrice: 25, unitCost: 20, subtotal: 50 }),
      }),
    );
  });

  it("decrementa o estoque corretamente e registra o movimento de venda", async () => {
    txMock.product.findUnique.mockImplementation(productLookup({ "prod-a": PRODUCT_A }));

    await createSale(
      {
        items: [{ productId: "prod-a", quantity: 3 }],
        payments: [{ method: "PIX", amount: 75 }],
        stockOverrideConfirmed: false,
      } as never,
      "user-1",
    );

    expect(txMock.product.update).toHaveBeenCalledWith({
      where: { id: "prod-a" },
      data: { stockQuantity: 7 },
    });
    expect(txMock.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "VENDA", quantity: -3, previousStock: 10, newStock: 7 }),
      }),
    );
  });

  it("bloqueia venda sem estoque suficiente quando não autorizada", async () => {
    txMock.product.findUnique.mockImplementation(productLookup({ "prod-a": PRODUCT_A }));

    await expect(
      createSale(
        {
          items: [{ productId: "prod-a", quantity: 999 }],
          payments: [{ method: "DINHEIRO", amount: 24975 }],
          stockOverrideConfirmed: false,
        } as never,
        "user-1",
      ),
    ).rejects.toThrow(/sem estoque suficiente/);
  });

  it("permite venda sem estoque quando stockOverrideConfirmed=true, e marca soldWithoutStock", async () => {
    txMock.product.findUnique.mockImplementation(productLookup({ "prod-a": PRODUCT_A }));

    await createSale(
      {
        items: [{ productId: "prod-a", quantity: 15 }],
        payments: [{ method: "DINHEIRO", amount: 375 }],
        stockOverrideConfirmed: true,
      } as never,
      "user-1",
    );

    expect(txMock.saleItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ soldWithoutStock: true }) }),
    );
    expect(txMock.product.update).toHaveBeenCalledWith({
      where: { id: "prod-a" },
      data: { stockQuantity: -5 },
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "VENDA_SEM_ESTOQUE_AUTORIZADA" }),
      }),
    );
  });

  it("aplica desconto por porcentagem corretamente", async () => {
    txMock.product.findUnique.mockImplementation(productLookup({ "prod-a": PRODUCT_A }));

    const result = await createSale(
      {
        items: [{ productId: "prod-a", quantity: 4 }], // subtotal 100
        discountPercent: 10,
        payments: [{ method: "DINHEIRO", amount: 90 }],
        stockOverrideConfirmed: false,
      } as never,
      "user-1",
    );

    expect(result.subtotal).toBe(100);
    expect(result.discountValue).toBe(10);
    expect(result.total).toBe(90);
  });

  it("rejeita desconto por porcentagem acima do limite da loja", async () => {
    txMock.product.findUnique.mockImplementation(productLookup({ "prod-a": PRODUCT_A }));

    await expect(
      createSale(
        {
          items: [{ productId: "prod-a", quantity: 4 }],
          discountPercent: 50,
          payments: [{ method: "DINHEIRO", amount: 50 }],
          stockOverrideConfirmed: false,
        } as never,
        "user-1",
      ),
    ).rejects.toThrow("Desconto máximo permitido é 30%.");
  });

  it("rejeita desconto por valor equivalente a mais de 30%", async () => {
    txMock.product.findUnique.mockImplementation(productLookup({ "prod-a": PRODUCT_A }));

    await expect(
      createSale(
        {
          items: [{ productId: "prod-a", quantity: 4 }], // subtotal 100
          discountValue: 40, // 40% > limite de 30%
          payments: [{ method: "DINHEIRO", amount: 60 }],
          stockOverrideConfirmed: false,
        } as never,
        "user-1",
      ),
    ).rejects.toThrow("Desconto máximo permitido é 30%.");
  });

  it("rejeita quando a soma dos pagamentos não bate com o total", async () => {
    txMock.product.findUnique.mockImplementation(productLookup({ "prod-a": PRODUCT_A }));

    await expect(
      createSale(
        {
          items: [{ productId: "prod-a", quantity: 1 }], // total 25
          payments: [{ method: "DINHEIRO", amount: 20 }],
          stockOverrideConfirmed: false,
        } as never,
        "user-1",
      ),
    ).rejects.toThrow(/soma dos pagamentos/);
  });

  it("aceita pagamento dividido entre dinheiro e PIX somando o total exato", async () => {
    txMock.product.findUnique.mockImplementation(productLookup({ "prod-a": PRODUCT_A }));

    const result = await createSale(
      {
        items: [{ productId: "prod-a", quantity: 4 }], // total 100
        payments: [
          { method: "DINHEIRO", amount: 50 },
          { method: "PIX", amount: 50 },
        ],
        stockOverrideConfirmed: false,
      } as never,
      "user-1",
    );

    expect(result.total).toBe(100);
    expect(txMock.payment.create).toHaveBeenCalledTimes(2);
  });

  it("calcula o troco corretamente quando o valor recebido é maior que o total em dinheiro", async () => {
    txMock.product.findUnique.mockImplementation(productLookup({ "prod-a": PRODUCT_A })); // salePrice 25

    const result = await createSale(
      {
        items: [{ productId: "prod-a", quantity: 1 }], // total 25
        payments: [{ method: "DINHEIRO", amount: 25 }],
        receivedAmount: 30,
        stockOverrideConfirmed: false,
      } as never,
      "user-1",
    );

    expect(result.receivedAmount).toBe(30);
    expect(result.changeAmount).toBe(5);
  });

  it("não gera troco quando não há pagamento em dinheiro", async () => {
    txMock.product.findUnique.mockImplementation(productLookup({ "prod-a": PRODUCT_A }));

    const result = await createSale(
      {
        items: [{ productId: "prod-a", quantity: 1 }],
        payments: [{ method: "PIX", amount: 25 }],
        stockOverrideConfirmed: false,
      } as never,
      "user-1",
    );

    expect(result.changeAmount).toBeNull();
  });

  it("rejeita produto inativo", async () => {
    txMock.product.findUnique.mockImplementation(
      productLookup({ "prod-a": { ...PRODUCT_A, active: false } }),
    );

    await expect(
      createSale(
        {
          items: [{ productId: "prod-a", quantity: 1 }],
          payments: [{ method: "DINHEIRO", amount: 25 }],
          stockOverrideConfirmed: false,
        } as never,
        "user-1",
      ),
    ).rejects.toThrow(AppError);
  });
});
