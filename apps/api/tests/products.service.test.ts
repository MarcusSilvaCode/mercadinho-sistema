import { describe, it, expect, vi, beforeEach } from "vitest";

const txMock = {
  product: { update: vi.fn() },
  priceHistory: { create: vi.fn() },
};

const prismaMock = {
  category: { findUnique: vi.fn() },
  product: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  storeSettings: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
  priceHistory: { create: vi.fn() },
  $transaction: vi.fn(async (cb: (tx: typeof txMock) => unknown) => cb(txMock)),
};

vi.mock("../src/config/prisma.js", () => ({ prisma: prismaMock }));

const { createProduct, updateProduct } = await import("../src/modules/products/products.service.js");
const { AppError } = await import("../src/shared/AppError.js");

const CATEGORY = { id: "cat-1", name: "Mercearia", active: true };

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.category.findUnique.mockResolvedValue(CATEGORY);
  prismaMock.storeSettings.findUnique.mockResolvedValue({ defaultMargin: 30 });
  prismaMock.auditLog.create.mockResolvedValue({});
});

describe("products.service — createProduct", () => {
  it("rejeita produto com categoria inexistente", async () => {
    prismaMock.category.findUnique.mockResolvedValue(null);

    await expect(
      createProduct(
        {
          name: "Arroz 5kg",
          categoryId: "cat-inexistente",
          unit: "UN",
          costPrice: 20,
          salePrice: 25,
          stockQuantity: 0,
          minStockQuantity: 5,
          barcode: "7891000100103",
        } as never,
        "user-1",
      ),
    ).rejects.toThrow(AppError);
  });

  it("gera SKU automaticamente quando não informado", async () => {
    prismaMock.product.findUnique.mockResolvedValue(null); // nenhum SKU colide
    prismaMock.product.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "prod-1", ...data }),
    );

    const product = await createProduct(
      {
        name: "Feijão 1kg",
        categoryId: "cat-1",
        unit: "UN",
        costPrice: 5,
        salePrice: 7,
        stockQuantity: 10,
        minStockQuantity: 2,
        barcode: "7891000100110",
      } as never,
      "user-1",
    );

    expect(product.sku).toMatch(/^PRD-[A-Z0-9]{6}$/);
  });

  it("usa a margem padrão da loja quando profitMargin não é informado", async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);
    prismaMock.product.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "prod-2", ...data }),
    );

    const product = await createProduct(
      {
        name: "Açúcar 1kg",
        categoryId: "cat-1",
        unit: "UN",
        costPrice: 4,
        salePrice: 5.5,
        stockQuantity: 10,
        minStockQuantity: 2,
        barcode: "7891000100127",
      } as never,
      "user-1",
    );

    expect(product.profitMargin).toBe(30);
  });

  it("respeita a margem específica do produto quando informada", async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);
    prismaMock.product.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "prod-3", ...data }),
    );

    const product = await createProduct(
      {
        name: "Sabonete",
        categoryId: "cat-1",
        unit: "UN",
        costPrice: 2,
        salePrice: 2.8,
        profitMargin: 40,
        stockQuantity: 10,
        minStockQuantity: 2,
        barcode: "7891000100134",
      } as never,
      "user-1",
    );

    expect(product.profitMargin).toBe(40);
  });
});

describe("products.service — updateProduct", () => {
  it("registra histórico de preço quando costPrice ou salePrice mudam", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: "prod-1",
      costPrice: 5,
      salePrice: 7,
    });
    txMock.product.update.mockResolvedValue({ id: "prod-1", costPrice: 6, salePrice: 8.4 });

    await updateProduct("prod-1", { costPrice: 6, salePrice: 8.4 } as never, "user-1");

    expect(txMock.priceHistory.create).toHaveBeenCalledTimes(2);
    expect(txMock.priceHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ field: "costPrice", oldValue: 5, newValue: 6 }),
      }),
    );
  });

  it("não registra histórico quando o preço não muda", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: "prod-1",
      costPrice: 5,
      salePrice: 7,
    });
    txMock.product.update.mockResolvedValue({ id: "prod-1", name: "Novo nome" });

    await updateProduct("prod-1", { name: "Novo nome" } as never, "user-1");

    expect(txMock.priceHistory.create).not.toHaveBeenCalled();
  });

  it("lança erro ao atualizar produto inexistente", async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);

    await expect(updateProduct("inexistente", { name: "X" } as never, "user-1")).rejects.toThrow(
      "Produto não encontrado.",
    );
  });
});
