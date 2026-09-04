import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = {
  cashierSession: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  cashMovement: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  sale: { findMany: vi.fn() },
  auditLog: { create: vi.fn() },
};

vi.mock("../src/config/prisma.js", () => ({ prisma: prismaMock }));

const { openCashier, registerCashMovement, closeCashier, getClosingSummary } = await import(
  "../src/modules/cashier/cashier.service.js"
);
const { AppError } = await import("../src/shared/AppError.js");

const OPEN_SESSION = {
  id: "session-1",
  userId: "user-1",
  openingAmount: 100,
  status: "ABERTO",
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.auditLog.create.mockResolvedValue({});
  prismaMock.sale.findMany.mockResolvedValue([]);
  prismaMock.cashMovement.findMany.mockResolvedValue([]);
});

describe("cashier.service — openCashier", () => {
  it("abre normalmente quando não há caixa aberto", async () => {
    prismaMock.cashierSession.findFirst.mockResolvedValue(null);
    prismaMock.cashierSession.create.mockResolvedValue(OPEN_SESSION);

    const session = await openCashier({ openingAmount: 100 }, "user-1");

    expect(session).toEqual(OPEN_SESSION);
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "CAIXA_ABERTO" }) }),
    );
  });

  it("rejeita abrir um segundo caixa enquanto o primeiro está aberto", async () => {
    prismaMock.cashierSession.findFirst.mockResolvedValue(OPEN_SESSION);

    await expect(openCashier({ openingAmount: 50 }, "user-2")).rejects.toThrow(
      "Já existe um caixa aberto. Feche-o antes de abrir outro.",
    );
    expect(prismaMock.cashierSession.create).not.toHaveBeenCalled();
  });
});

describe("cashier.service — registerCashMovement", () => {
  it("registra uma sangria quando há caixa aberto", async () => {
    prismaMock.cashierSession.findFirst.mockResolvedValue(OPEN_SESSION);
    prismaMock.cashMovement.create.mockResolvedValue({ id: "mov-1", type: "SANGRIA", amount: 50 });

    const movement = await registerCashMovement({ type: "SANGRIA", amount: 50, reason: "Depósito" }, "user-1");

    expect(movement.type).toBe("SANGRIA");
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "SANGRIA_REGISTRADA" }) }),
    );
  });

  it("rejeita movimentação quando não há caixa aberto", async () => {
    prismaMock.cashierSession.findFirst.mockResolvedValue(null);

    await expect(
      registerCashMovement({ type: "SUPRIMENTO", amount: 30, reason: "Troco" }, "user-1"),
    ).rejects.toThrow("Não há caixa aberto no momento.");
  });
});

describe("cashier.service — cálculo de fechamento", () => {
  it("segue o exemplo da especificação: abertura 100, vendas dinheiro 500, sangria 200 -> esperado 400", async () => {
    prismaMock.cashierSession.findUnique.mockResolvedValue({ ...OPEN_SESSION, openingAmount: 100 });
    prismaMock.sale.findMany.mockResolvedValue([
      { total: 500, payments: [{ method: "DINHEIRO", amount: 500 }] },
    ]);
    prismaMock.cashMovement.findMany.mockResolvedValue([{ type: "SANGRIA", amount: 200 }]);

    const { totals } = await getClosingSummary("session-1");

    expect(totals.expectedCash).toBe(400);
  });

  it("PIX, débito e crédito NUNCA entram no cálculo do dinheiro físico esperado", async () => {
    prismaMock.cashierSession.findUnique.mockResolvedValue({ ...OPEN_SESSION, openingAmount: 100 });
    prismaMock.sale.findMany.mockResolvedValue([
      {
        total: 300,
        payments: [
          { method: "DINHEIRO", amount: 50 },
          { method: "PIX", amount: 100 },
          { method: "DEBITO", amount: 80 },
          { method: "CREDITO", amount: 70 },
        ],
      },
    ]);
    prismaMock.cashMovement.findMany.mockResolvedValue([]);

    const { totals } = await getClosingSummary("session-1");

    // esperado = 100 (abertura) + 50 (só a parcela em dinheiro) = 150
    expect(totals.expectedCash).toBe(150);
    expect(totals.paymentTotals.PIX).toBe(100);
    expect(totals.paymentTotals.DEBITO).toBe(80);
    expect(totals.paymentTotals.CREDITO).toBe(70);
  });

  it("suprimento aumenta o dinheiro esperado", async () => {
    prismaMock.cashierSession.findUnique.mockResolvedValue({ ...OPEN_SESSION, openingAmount: 100 });
    prismaMock.sale.findMany.mockResolvedValue([]);
    prismaMock.cashMovement.findMany.mockResolvedValue([{ type: "SUPRIMENTO", amount: 40 }]);

    const { totals } = await getClosingSummary("session-1");

    expect(totals.expectedCash).toBe(140);
  });

  it("calcula a diferença corretamente entre contado e esperado (sobra e falta)", async () => {
    prismaMock.cashierSession.findUnique.mockResolvedValue({ ...OPEN_SESSION, openingAmount: 100 });
    prismaMock.sale.findMany.mockResolvedValue([]);
    prismaMock.cashMovement.findMany.mockResolvedValue([]);
    prismaMock.cashierSession.update.mockResolvedValue({});

    const shortResult = await closeCashier("session-1", { countedCash: 90 }, "user-1");
    expect(shortResult.difference).toBe(-10); // faltou 10

    prismaMock.cashierSession.findUnique.mockResolvedValue({ ...OPEN_SESSION, openingAmount: 100 });
    const overResult = await closeCashier("session-1", { countedCash: 115 }, "user-1");
    expect(overResult.difference).toBe(15); // sobrou 15
  });

  it("rejeita fechar um caixa que já está fechado", async () => {
    prismaMock.cashierSession.findUnique.mockResolvedValue({ ...OPEN_SESSION, status: "FECHADO" });

    await expect(closeCashier("session-1", { countedCash: 100 }, "user-1")).rejects.toThrow(AppError);
  });

  it("rejeita fechar um caixa inexistente", async () => {
    prismaMock.cashierSession.findUnique.mockResolvedValue(null);

    await expect(closeCashier("inexistente", { countedCash: 100 }, "user-1")).rejects.toThrow(
      "Caixa não encontrado.",
    );
  });
});
