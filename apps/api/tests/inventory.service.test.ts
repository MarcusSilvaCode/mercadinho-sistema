import { describe, it, expect, vi, beforeEach } from "vitest";

const txMock = {
  product: { findUnique: vi.fn(), update: vi.fn() },
  stockMovement: { create: vi.fn() },
  inventory: { update: vi.fn() },
};

const prismaMock = {
  inventory: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  product: { findUnique: vi.fn() },
  inventoryItem: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(async (cb: (tx: typeof txMock) => unknown) => cb(txMock)),
};

vi.mock("../src/config/prisma.js", () => ({ prisma: prismaMock }));

const { countItem, finishInventory } = await import("../src/modules/inventory/inventory.service.js");
const { AppError } = await import("../src/shared/AppError.js");

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.auditLog.create.mockResolvedValue({});
});

describe("inventory.service — countItem", () => {
  it("calcula a diferença como contado - esperado no momento da contagem", async () => {
    prismaMock.inventory.findUnique.mockResolvedValue({ id: "inv-1", finishedAt: null });
    prismaMock.product.findUnique.mockResolvedValue({ id: "prod-1", stockQuantity: 20 });
    prismaMock.inventoryItem.findFirst.mockResolvedValue(null);
    prismaMock.inventoryItem.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "item-1", ...data }),
    );

    const item = await countItem("inv-1", { productId: "prod-1", countedQty: 17 });

    expect(item.expectedQty).toBe(20);
    expect(item.difference).toBe(-3);
  });

  it("atualiza a contagem existente em vez de duplicar o item", async () => {
    prismaMock.inventory.findUnique.mockResolvedValue({ id: "inv-1", finishedAt: null });
    prismaMock.product.findUnique.mockResolvedValue({ id: "prod-1", stockQuantity: 10 });
    prismaMock.inventoryItem.findFirst.mockResolvedValue({ id: "item-1", inventoryId: "inv-1" });
    prismaMock.inventoryItem.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "item-1", ...data }),
    );

    await countItem("inv-1", { productId: "prod-1", countedQty: 12 });

    expect(prismaMock.inventoryItem.create).not.toHaveBeenCalled();
    expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { countedQty: 12, difference: 2 } }),
    );
  });

  it("rejeita contagem em inventário já finalizado", async () => {
    prismaMock.inventory.findUnique.mockResolvedValue({ id: "inv-1", finishedAt: new Date() });

    await expect(countItem("inv-1", { productId: "prod-1", countedQty: 5 })).rejects.toThrow(
      "Este inventário já foi finalizado.",
    );
  });
});

describe("inventory.service — finishInventory", () => {
  it("ajusta o estoque apenas dos itens com diferença, ignorando os que batem", async () => {
    prismaMock.inventory.findUnique
      .mockResolvedValueOnce({
        id: "inv-1",
        finishedAt: null,
        items: [
          { productId: "prod-1", countedQty: 8, difference: -2 }, // precisa ajustar
          { productId: "prod-2", countedQty: 5, difference: 0 }, // bateu, não ajusta
        ],
      })
      .mockResolvedValueOnce({ id: "inv-1", finishedAt: new Date(), items: [] }); // chamada final do getInventory

    txMock.product.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(where.id === "prod-1" ? { id: "prod-1", stockQuantity: 10 } : { id: "prod-2", stockQuantity: 5 }),
    );
    txMock.product.update.mockResolvedValue({});
    txMock.stockMovement.create.mockResolvedValue({});
    txMock.inventory.update.mockResolvedValue({});

    await finishInventory("inv-1", "user-1");

    expect(txMock.product.update).toHaveBeenCalledTimes(1);
    expect(txMock.product.update).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: { stockQuantity: 8 },
    });
    expect(txMock.stockMovement.create).toHaveBeenCalledTimes(1);
  });

  it("rejeita finalizar um inventário sem nenhum item contado", async () => {
    prismaMock.inventory.findUnique.mockResolvedValue({ id: "inv-1", finishedAt: null, items: [] });

    await expect(finishInventory("inv-1", "user-1")).rejects.toThrow(
      "Conte ao menos um produto antes de finalizar o inventário.",
    );
  });

  it("rejeita finalizar um inventário já finalizado", async () => {
    prismaMock.inventory.findUnique.mockResolvedValue({
      id: "inv-1",
      finishedAt: new Date(),
      items: [{ productId: "prod-1", countedQty: 1, difference: 0 }],
    });

    await expect(finishInventory("inv-1", "user-1")).rejects.toThrow(AppError);
  });
});
