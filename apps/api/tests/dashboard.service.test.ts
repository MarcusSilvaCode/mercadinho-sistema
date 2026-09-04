import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = {
  sale: { findMany: vi.fn() },
  product: { findMany: vi.fn(), count: vi.fn() },
  cashierSession: { findFirst: vi.fn() },
  cashMovement: { findMany: vi.fn() },
  backupLog: { findFirst: vi.fn() },
};

vi.mock("../src/config/prisma.js", () => ({ prisma: prismaMock }));

const { getDashboardSummary } = await import("../src/modules/dashboard/dashboard.service.js");

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.product.findMany.mockResolvedValue([]);
  prismaMock.product.count.mockResolvedValue(0);
  prismaMock.cashierSession.findFirst.mockResolvedValue(null);
  prismaMock.cashMovement.findMany.mockResolvedValue([]);
  prismaMock.backupLog.findFirst.mockResolvedValue(null);
});

describe("dashboard.service — faturamento e lucro estimado", () => {
  it("calcula faturamento e lucro estimado a partir de vendas concluídas sem desconto", async () => {
    prismaMock.sale.findMany.mockResolvedValue([
      {
        subtotal: 100,
        discountValue: 0,
        items: [{ quantity: 4, returnedQuantity: 0, unitPrice: 25, unitCost: 20 }],
      },
    ]);

    const result = await getDashboardSummary();

    expect(result.today.faturamento).toBe(100);
    expect(result.today.lucroEstimado).toBe(20); // (25-20)*4
    expect(result.today.quantidadeVendas).toBe(1);
    expect(result.today.ticketMedio).toBe(100);
  });

  it("rateia o desconto proporcionalmente entre os itens ao calcular o lucro", async () => {
    prismaMock.sale.findMany.mockResolvedValue([
      {
        subtotal: 100,
        discountValue: 10, // 10% de desconto sobre o total
        items: [{ quantity: 4, returnedQuantity: 0, unitPrice: 25, unitCost: 20 }],
      },
    ]);

    const result = await getDashboardSummary();

    expect(result.today.faturamento).toBe(90); // 100 - 10
    expect(result.today.lucroEstimado).toBe(10); // (100-80) - 10 de desconto
  });

  it("desconta a quantidade devolvida do lucro e faturamento", async () => {
    prismaMock.sale.findMany.mockResolvedValue([
      {
        subtotal: 100,
        discountValue: 0,
        items: [{ quantity: 4, returnedQuantity: 1, unitPrice: 25, unitCost: 20 }], // só 3 ainda ativas
      },
    ]);

    const result = await getDashboardSummary();

    expect(result.today.faturamento).toBe(75); // 3 * 25
    expect(result.today.lucroEstimado).toBe(15); // 3 * (25-20)
  });

  it("calcula o ticket médio dividindo o faturamento pelo número de vendas", async () => {
    prismaMock.sale.findMany.mockResolvedValue([
      { subtotal: 50, discountValue: 0, items: [{ quantity: 1, returnedQuantity: 0, unitPrice: 50, unitCost: 30 }] },
      { subtotal: 30, discountValue: 0, items: [{ quantity: 1, returnedQuantity: 0, unitPrice: 30, unitCost: 20 }] },
    ]);

    const result = await getDashboardSummary();

    expect(result.today.ticketMedio).toBe(40); // (50+30)/2
  });

  it("retorna zeros quando não há vendas hoje (sem divisão por zero)", async () => {
    prismaMock.sale.findMany.mockResolvedValue([]);

    const result = await getDashboardSummary();

    expect(result.today).toEqual({
      faturamento: 0,
      quantidadeVendas: 0,
      lucroEstimado: 0,
      ticketMedio: 0,
    });
  });
});

describe("dashboard.service — estoque", () => {
  it("classifica corretamente baixo, sem estoque e negativo", async () => {
    prismaMock.sale.findMany.mockResolvedValue([]);
    prismaMock.product.findMany.mockResolvedValue([
      { stockQuantity: 0, minStockQuantity: 5 }, // sem estoque
      { stockQuantity: -2, minStockQuantity: 5 }, // negativo
      { stockQuantity: 3, minStockQuantity: 5 }, // baixo (>0 e <= mínimo)
      { stockQuantity: 20, minStockQuantity: 5 }, // ok
    ]);

    const result = await getDashboardSummary();

    expect(result.estoque.totalProdutos).toBe(4);
    expect(result.estoque.semEstoque).toBe(1);
    expect(result.estoque.estoqueNegativo).toBe(1);
    expect(result.estoque.estoqueBaixo).toBe(1);
  });

  it("gera alertas apenas quando as respectivas contagens são maiores que zero", async () => {
    prismaMock.sale.findMany.mockResolvedValue([]);
    prismaMock.product.findMany.mockResolvedValue([]);
    prismaMock.product.count.mockResolvedValue(0);

    const result = await getDashboardSummary();

    expect(result.alertas.estoqueBaixo).toBe(false);
    expect(result.alertas.semEstoque).toBe(false);
    expect(result.alertas.produtosVencidos).toBe(false);
  });
});

describe("dashboard.service — caixa", () => {
  it("retorna status FECHADO quando não há sessão aberta", async () => {
    prismaMock.sale.findMany.mockResolvedValue([]);
    prismaMock.cashierSession.findFirst.mockResolvedValue(null);

    const result = await getDashboardSummary();

    expect(result.caixa).toEqual({ status: "FECHADO" });
  });

  it("retorna status ABERTO com os totais quando há sessão aberta", async () => {
    prismaMock.sale.findMany.mockResolvedValue([]);
    prismaMock.cashierSession.findFirst.mockResolvedValue({
      id: "session-1",
      openingAmount: 100,
      user: { fullName: "Admin" },
    });

    const result = await getDashboardSummary();

    expect(result.caixa.status).toBe("ABERTO");
    expect((result.caixa as { openingAmount: number }).openingAmount).toBe(100);
  });
});

describe("dashboard.service — alerta de backup (Fase 15)", () => {
  it("não acende o alerta quando o último backup foi bem-sucedido", async () => {
    prismaMock.sale.findMany.mockResolvedValue([]);
    prismaMock.backupLog.findFirst.mockResolvedValue({ status: "SUCESSO" });

    const result = await getDashboardSummary();

    expect(result.alertas.backup).toBe(false);
  });

  it("acende o alerta quando o último backup falhou", async () => {
    prismaMock.sale.findMany.mockResolvedValue([]);
    prismaMock.backupLog.findFirst.mockResolvedValue({ status: "FALHA" });

    const result = await getDashboardSummary();

    expect(result.alertas.backup).toBe(true);
  });

  it("não acende o alerta quando nunca houve backup", async () => {
    prismaMock.sale.findMany.mockResolvedValue([]);
    prismaMock.backupLog.findFirst.mockResolvedValue(null);

    const result = await getDashboardSummary();

    expect(result.alertas.backup).toBe(false);
  });
});
