import { describe, it, expect, vi, beforeEach } from "vitest";

const txMock = {
  product: { update: vi.fn() },
  stockMovement: { create: vi.fn() },
};

const prismaMock = {
  product: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(async (cb: (tx: typeof txMock) => unknown) => cb(txMock)),
};

vi.mock("../src/config/prisma.js", () => ({ prisma: prismaMock }));

const { adjustStock } = await import("../src/modules/stock/stock.service.js");
const { AppError } = await import("../src/shared/AppError.js");

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.auditLog.create.mockResolvedValue({});
});

describe("stock.service — adjustStock", () => {
  it("soma corretamente um ajuste positivo (entrada manual)", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "prod-1", stockQuantity: 10 });
    txMock.product.update.mockResolvedValue({ id: "prod-1", stockQuantity: 15 });
    txMock.stockMovement.create.mockResolvedValue({});

    await adjustStock({ productId: "prod-1", quantity: 5, reason: "Correção de contagem" }, "user-1");

    expect(txMock.product.update).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: { stockQuantity: 15 },
    });
    expect(txMock.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "AJUSTE",
          quantity: 5,
          previousStock: 10,
          newStock: 15,
        }),
      }),
    );
  });

  it("subtrai corretamente um ajuste negativo (perda/quebra)", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "prod-1", stockQuantity: 10 });
    txMock.product.update.mockResolvedValue({ id: "prod-1", stockQuantity: 7 });
    txMock.stockMovement.create.mockResolvedValue({});

    await adjustStock({ productId: "prod-1", quantity: -3, reason: "Produto quebrado" }, "user-1");

    expect(txMock.product.update).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: { stockQuantity: 7 },
    });
  });

  it("permite o ajuste resultar em estoque negativo (decisão deliberada do administrador)", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "prod-1", stockQuantity: 2 });
    txMock.product.update.mockResolvedValue({ id: "prod-1", stockQuantity: -3 });
    txMock.stockMovement.create.mockResolvedValue({});

    await adjustStock({ productId: "prod-1", quantity: -5, reason: "Erro de contagem" }, "user-1");

    expect(txMock.product.update).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: { stockQuantity: -3 },
    });
  });

  it("lança erro ao ajustar produto inexistente", async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);

    await expect(
      adjustStock({ productId: "inexistente", quantity: 5, reason: "Motivo" }, "user-1"),
    ).rejects.toThrow(AppError);
  });

  it("registra auditoria com o motivo do ajuste", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "prod-1", stockQuantity: 10 });
    txMock.product.update.mockResolvedValue({ id: "prod-1", stockQuantity: 8 });
    txMock.stockMovement.create.mockResolvedValue({});

    await adjustStock({ productId: "prod-1", quantity: -2, reason: "Vencimento" }, "user-1");

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "AJUSTE_ESTOQUE",
          details: expect.objectContaining({ reason: "Vencimento" }),
        }),
      }),
    );
  });
});
