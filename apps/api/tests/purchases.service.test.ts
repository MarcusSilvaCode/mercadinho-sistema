import { describe, it, expect, vi, beforeEach } from "vitest";

const txMock = {
  purchase: { create: vi.fn() },
  product: { findUnique: vi.fn(), update: vi.fn() },
  purchaseItem: { create: vi.fn() },
  stockMovement: { create: vi.fn() },
  priceHistory: { create: vi.fn() },
};

const prismaMock = {
  $transaction: vi.fn(async (cb: (tx: typeof txMock) => unknown) => cb(txMock)),
  auditLog: { create: vi.fn() },
};

vi.mock("../src/config/prisma.js", () => ({ prisma: prismaMock }));

const { createPurchase } = await import("../src/modules/purchases/purchases.service.js");
const { AppError } = await import("../src/shared/AppError.js");

const PRODUCT_A = {
  id: "prod-a",
  name: "Arroz 5kg",
  stockQuantity: 10,
  costPrice: 20,
  profitMargin: 30,
};

const PRODUCT_B = {
  id: "prod-b",
  name: "Feijão 1kg",
  stockQuantity: 5,
  costPrice: 5,
  profitMargin: 40,
};

beforeEach(() => {
  vi.clearAllMocks();
  txMock.purchase.create.mockResolvedValue({ id: "purchase-1" });
  txMock.product.update.mockResolvedValue({});
  txMock.purchaseItem.create.mockResolvedValue({});
  txMock.stockMovement.create.mockResolvedValue({});
  txMock.priceHistory.create.mockResolvedValue({});
  prismaMock.auditLog.create.mockResolvedValue({});
});

describe("purchases.service — createPurchase", () => {
  it("soma a quantidade ao estoque de cada produto", async () => {
    txMock.product.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(where.id === "prod-a" ? PRODUCT_A : PRODUCT_B),
    );

    await createPurchase(
      {
        items: [
          { productId: "prod-a", quantity: 20, unitCost: 20 },
          { productId: "prod-b", quantity: 10, unitCost: 5 },
        ],
      },
      "user-1",
    );

    expect(txMock.product.update).toHaveBeenNthCalledWith(1, {
      where: { id: "prod-a" },
      data: expect.objectContaining({ stockQuantity: 30 }),
    });
    expect(txMock.product.update).toHaveBeenNthCalledWith(2, {
      where: { id: "prod-b" },
      data: expect.objectContaining({ stockQuantity: 15 }),
    });
  });

  it("substitui o custo anterior pelo novo (sem custo médio)", async () => {
    txMock.product.findUnique.mockResolvedValue(PRODUCT_A);

    await createPurchase({ items: [{ productId: "prod-a", quantity: 5, unitCost: 6 }] }, "user-1");

    expect(txMock.product.update).toHaveBeenCalledWith({
      where: { id: "prod-a" },
      data: expect.objectContaining({ costPrice: 6 }),
    });
  });

  it("grava histórico de preço somente quando o custo muda", async () => {
    txMock.product.findUnique.mockResolvedValue(PRODUCT_A); // costPrice atual = 20

    await createPurchase({ items: [{ productId: "prod-a", quantity: 5, unitCost: 20 }] }, "user-1");
    expect(txMock.priceHistory.create).not.toHaveBeenCalled();

    vi.clearAllMocks();
    txMock.product.findUnique.mockResolvedValue(PRODUCT_A);
    txMock.purchase.create.mockResolvedValue({ id: "purchase-2" });

    await createPurchase({ items: [{ productId: "prod-a", quantity: 5, unitCost: 25 }] }, "user-1");
    expect(txMock.priceHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ field: "costPrice", oldValue: 20, newValue: 25 }),
      }),
    );
  });

  it("calcula o preço de venda sugerido a partir do novo custo e da margem do produto", async () => {
    txMock.product.findUnique.mockResolvedValue(PRODUCT_B); // margem 40%

    const result = await createPurchase(
      { items: [{ productId: "prod-b", quantity: 10, unitCost: 6 }] },
      "user-1",
    );

    // custo 6, margem 40% -> sugerido 8.40 (mesmo exemplo da especificação)
    expect(result.lines[0].suggestedSalePrice).toBe(8.4);
  });

  it("calcula o total da entrada no backend, ignorando qualquer valor externo", async () => {
    txMock.product.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(where.id === "prod-a" ? PRODUCT_A : PRODUCT_B),
    );

    const result = await createPurchase(
      {
        items: [
          { productId: "prod-a", quantity: 10, unitCost: 20 }, // 200
          { productId: "prod-b", quantity: 5, unitCost: 5 }, // 25
        ],
      },
      "user-1",
    );

    expect(result.total).toBe(225);
  });

  it("reverte tudo (não aplica nenhuma linha) se um produto da lista não existir", async () => {
    txMock.product.findUnique
      .mockResolvedValueOnce(PRODUCT_A) // primeira linha existe
      .mockResolvedValueOnce(null); // segunda linha não existe -> deve lançar

    await expect(
      createPurchase(
        {
          items: [
            { productId: "prod-a", quantity: 10, unitCost: 20 },
            { productId: "prod-inexistente", quantity: 5, unitCost: 5 },
          ],
        },
        "user-1",
      ),
    ).rejects.toThrow(AppError);
  });

  it("atualiza lote e validade do produto quando informados", async () => {
    txMock.product.findUnique.mockResolvedValue(PRODUCT_A);

    const expirationDate = new Date("2026-12-31");
    await createPurchase(
      { items: [{ productId: "prod-a", quantity: 5, unitCost: 20, batch: "L001", expirationDate }] },
      "user-1",
    );

    expect(txMock.product.update).toHaveBeenCalledWith({
      where: { id: "prod-a" },
      data: expect.objectContaining({ batch: "L001", expirationDate }),
    });
  });
});
