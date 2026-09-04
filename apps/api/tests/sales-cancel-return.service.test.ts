import { describe, it, expect, vi, beforeEach } from "vitest";

const txMock = {
  product: { findUnique: vi.fn(), update: vi.fn() },
  stockMovement: { create: vi.fn() },
  sale: { update: vi.fn() },
  saleItem: { update: vi.fn(), findMany: vi.fn() },
};

const prismaMock = {
  sale: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(async (cb: (tx: typeof txMock) => unknown) => cb(txMock)),
};

vi.mock("../src/config/prisma.js", () => ({ prisma: prismaMock }));

const { cancelSale, returnSale } = await import("../src/modules/sales/sales.service.js");
const { AppError } = await import("../src/shared/AppError.js");

const PRODUCT_A = { id: "prod-a", stockQuantity: 5 };
const PRODUCT_B = { id: "prod-b", stockQuantity: 2 };

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.auditLog.create.mockResolvedValue({});
  txMock.product.update.mockResolvedValue({});
  txMock.stockMovement.create.mockResolvedValue({});
  txMock.sale.update.mockResolvedValue({});
  // getSale (chamado ao final) faz uma segunda leitura — deixa neutro por padrão
  prismaMock.sale.findUnique.mockImplementation(() =>
    Promise.resolve({ id: "sale-1", status: "CANCELADA", items: [] }),
  );
});

describe("sales.service — cancelSale", () => {
  const SALE = {
    id: "sale-1",
    status: "CONCLUIDA",
    items: [
      { id: "item-1", productId: "prod-a", quantity: 2, returnedQuantity: 0 },
      { id: "item-2", productId: "prod-b", quantity: 1, returnedQuantity: 0 },
    ],
  };

  it("devolve o estoque de todos os itens ao cancelar", async () => {
    prismaMock.sale.findUnique.mockResolvedValueOnce(SALE).mockResolvedValueOnce({ ...SALE, status: "CANCELADA" });
    txMock.product.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(where.id === "prod-a" ? PRODUCT_A : PRODUCT_B),
    );

    await cancelSale("sale-1", { reason: "Cliente desistiu" }, "user-1");

    expect(txMock.product.update).toHaveBeenCalledWith({ where: { id: "prod-a" }, data: { stockQuantity: 7 } });
    expect(txMock.product.update).toHaveBeenCalledWith({ where: { id: "prod-b" }, data: { stockQuantity: 3 } });
    expect(txMock.stockMovement.create).toHaveBeenCalledTimes(2);
  });

  it("marca a venda como CANCELADA com o motivo informado", async () => {
    prismaMock.sale.findUnique.mockResolvedValueOnce(SALE).mockResolvedValueOnce({ ...SALE, status: "CANCELADA" });
    txMock.product.findUnique.mockResolvedValue(PRODUCT_A);

    await cancelSale("sale-1", { reason: "Erro de digitação" }, "user-1");

    expect(txMock.sale.update).toHaveBeenCalledWith({
      where: { id: "sale-1" },
      data: { status: "CANCELADA", cancelReason: "Erro de digitação" },
    });
  });

  it("rejeita cancelar uma venda que não está CONCLUIDA", async () => {
    prismaMock.sale.findUnique.mockResolvedValueOnce({ ...SALE, status: "CANCELADA" });

    await expect(cancelSale("sale-1", { reason: "Motivo" }, "user-1")).rejects.toThrow(
      /não pode ser cancelada/,
    );
  });

  it("rejeita cancelar venda inexistente", async () => {
    prismaMock.sale.findUnique.mockResolvedValueOnce(null);

    await expect(cancelSale("inexistente", { reason: "Motivo" }, "user-1")).rejects.toThrow(AppError);
  });
});

describe("sales.service — returnSale", () => {
  const SALE = {
    id: "sale-1",
    status: "CONCLUIDA",
    items: [
      { id: "item-1", productId: "prod-a", quantity: 5, returnedQuantity: 0 },
      { id: "item-2", productId: "prod-b", quantity: 2, returnedQuantity: 0 },
    ],
  };

  it("devolve parcialmente e marca a venda como DEVOLVIDA_PARCIAL", async () => {
    prismaMock.sale.findUnique
      .mockResolvedValueOnce(SALE)
      .mockResolvedValueOnce({ ...SALE, status: "DEVOLVIDA_PARCIAL" });
    txMock.product.findUnique.mockResolvedValue(PRODUCT_A);
    txMock.saleItem.findMany.mockResolvedValue([
      { id: "item-1", quantity: 5, returnedQuantity: 2 }, // devolveu só parte
      { id: "item-2", quantity: 2, returnedQuantity: 0 },
    ]);

    await returnSale("sale-1", { items: [{ saleItemId: "item-1", quantity: 2 }], reason: "Produto avariado" }, "user-1");

    expect(txMock.saleItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { returnedQuantity: 2, returned: false },
    });
    expect(txMock.sale.update).toHaveBeenCalledWith({
      where: { id: "sale-1" },
      data: { status: "DEVOLVIDA_PARCIAL" },
    });
  });

  it("marca DEVOLVIDA_TOTAL quando todos os itens ficam totalmente devolvidos", async () => {
    prismaMock.sale.findUnique
      .mockResolvedValueOnce(SALE)
      .mockResolvedValueOnce({ ...SALE, status: "DEVOLVIDA_TOTAL" });
    txMock.product.findUnique.mockResolvedValue(PRODUCT_A);
    txMock.saleItem.findMany.mockResolvedValue([
      { id: "item-1", quantity: 5, returnedQuantity: 5 },
      { id: "item-2", quantity: 2, returnedQuantity: 2 },
    ]);

    await returnSale(
      "sale-1",
      {
        items: [
          { saleItemId: "item-1", quantity: 5 },
          { saleItemId: "item-2", quantity: 2 },
        ],
        reason: "Devolução total solicitada pelo cliente",
      },
      "user-1",
    );

    expect(txMock.sale.update).toHaveBeenCalledWith({
      where: { id: "sale-1" },
      data: { status: "DEVOLVIDA_TOTAL" },
    });
  });

  it("devolve o estoque do item devolvido", async () => {
    prismaMock.sale.findUnique.mockResolvedValueOnce(SALE).mockResolvedValueOnce(SALE);
    txMock.product.findUnique.mockResolvedValue(PRODUCT_A); // stockQuantity 5
    txMock.saleItem.findMany.mockResolvedValue([
      { id: "item-1", quantity: 5, returnedQuantity: 3 },
      { id: "item-2", quantity: 2, returnedQuantity: 0 },
    ]);

    await returnSale("sale-1", { items: [{ saleItemId: "item-1", quantity: 3 }], reason: "Motivo" }, "user-1");

    expect(txMock.product.update).toHaveBeenCalledWith({ where: { id: "prod-a" }, data: { stockQuantity: 8 } });
  });

  it("rejeita devolver mais do que o restante disponível no item", async () => {
    prismaMock.sale.findUnique.mockResolvedValueOnce({
      ...SALE,
      items: [{ id: "item-1", productId: "prod-a", quantity: 5, returnedQuantity: 4 }],
    });

    await expect(
      returnSale("sale-1", { items: [{ saleItemId: "item-1", quantity: 2 }], reason: "Motivo" }, "user-1"),
    ).rejects.toThrow(/excede o que ainda pode ser devolvido/);
  });

  it("rejeita devolução em venda já cancelada", async () => {
    prismaMock.sale.findUnique.mockResolvedValueOnce({ ...SALE, status: "CANCELADA" });

    await expect(
      returnSale("sale-1", { items: [{ saleItemId: "item-1", quantity: 1 }], reason: "Motivo" }, "user-1"),
    ).rejects.toThrow(/não admite mais devoluções/);
  });

  it("rejeita devolução em venda já totalmente devolvida", async () => {
    prismaMock.sale.findUnique.mockResolvedValueOnce({ ...SALE, status: "DEVOLVIDA_TOTAL" });

    await expect(
      returnSale("sale-1", { items: [{ saleItemId: "item-1", quantity: 1 }], reason: "Motivo" }, "user-1"),
    ).rejects.toThrow(/não admite mais devoluções/);
  });

  it("rejeita item de venda inexistente na venda informada", async () => {
    prismaMock.sale.findUnique.mockResolvedValueOnce(SALE);

    await expect(
      returnSale("sale-1", { items: [{ saleItemId: "item-fantasma", quantity: 1 }], reason: "Motivo" }, "user-1"),
    ).rejects.toThrow(AppError);
  });
});
