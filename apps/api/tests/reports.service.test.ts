import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = {
  sale: { findMany: vi.fn() },
  payment: { findMany: vi.fn() },
  saleItem: { findMany: vi.fn() },
};

vi.mock("../src/config/prisma.js", () => ({ prisma: prismaMock }));

const { resolveDateRange } = await import("../src/shared/dateRanges.js");
const reportsService = await import("../src/modules/reports/reports.service.js");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("dateRanges — resolveDateRange", () => {
  it("'hoje' cobre exatamente as 24h do dia atual", () => {
    const { start, end } = resolveDateRange({ preset: "hoje" });
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBe(24);
    expect(start.getHours()).toBe(0);
  });

  it("'ontem' termina exatamente onde 'hoje' começa", () => {
    const hoje = resolveDateRange({ preset: "hoje" });
    const ontem = resolveDateRange({ preset: "ontem" });
    expect(ontem.end.getTime()).toBe(hoje.start.getTime());
  });

  it("'ultimos_7_dias' cobre 7 dias completos terminando hoje", () => {
    const { start, end } = resolveDateRange({ preset: "ultimos_7_dias" });
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(7);
  });

  it("'este_mes' começa no dia 1 do mês atual", () => {
    const { start } = resolveDateRange({ preset: "este_mes" });
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(new Date().getMonth());
  });

  it("'mes_anterior' cobre do dia 1 do mês passado até o dia 1 deste mês", () => {
    const { start, end } = resolveDateRange({ preset: "mes_anterior" });
    const esteMs = resolveDateRange({ preset: "este_mes" });
    expect(start.getDate()).toBe(1);
    expect(end.getTime()).toBe(esteMs.start.getTime());
  });

  it("período personalizado usa from/to explícitos com end exclusivo (dia seguinte a 'to')", () => {
    const from = new Date(2026, 0, 10);
    const to = new Date(2026, 0, 12);
    const { start, end } = resolveDateRange({ from, to });
    expect(start.getDate()).toBe(10);
    expect(end.getDate()).toBe(13); // exclusivo: inclui até o fim do dia 12
  });

  it("sem preset e sem from/to, cai em 'hoje' como padrão seguro", () => {
    const { start, end } = resolveDateRange({});
    const hoje = resolveDateRange({ preset: "hoje" });
    expect(start.getTime()).toBe(hoje.start.getTime());
    expect(end.getTime()).toBe(hoje.end.getTime());
  });
});

describe("reports.service — getSalesSummary", () => {
  it("calcula faturamento bruto, desconto, líquido, CPV e lucro estimado", async () => {
    prismaMock.sale.findMany.mockResolvedValue([
      {
        subtotal: 100,
        discountValue: 10,
        items: [{ quantity: 4, returnedQuantity: 0, unitPrice: 25, unitCost: 20 }],
      },
    ]);

    const result = await reportsService.getSalesSummary(new Date(2026, 0, 1), new Date(2026, 0, 2));

    expect(result.faturamentoBruto).toBe(100);
    expect(result.descontos).toBe(10);
    expect(result.faturamentoLiquido).toBe(90);
    expect(result.cpv).toBe(80);
    expect(result.lucroEstimado).toBe(10); // (100-80) - 10 de desconto
  });
});

describe("reports.service — getSalesByPayment", () => {
  it("soma os pagamentos por método, incluindo métodos sem uso com total zero", async () => {
    prismaMock.payment.findMany.mockResolvedValue([
      { method: "DINHEIRO", amount: 50 },
      { method: "DINHEIRO", amount: 20 },
      { method: "PIX", amount: 30 },
    ]);

    const result = await reportsService.getSalesByPayment({ preset: "hoje" } as never);

    const dinheiro = result.items.find((i) => i.method === "DINHEIRO");
    const pix = result.items.find((i) => i.method === "PIX");
    const credito = result.items.find((i) => i.method === "CREDITO");

    expect(dinheiro?.total).toBe(70);
    expect(pix?.total).toBe(30);
    expect(credito?.total).toBe(0);
  });
});

describe("reports.service — getSalesByUser", () => {
  it("agrupa vendas por usuário somando faturamento e contando vendas", async () => {
    prismaMock.sale.findMany.mockResolvedValue([
      { userId: "u1", user: { id: "u1", fullName: "Admin 1" }, total: 50 },
      { userId: "u1", user: { id: "u1", fullName: "Admin 1" }, total: 30 },
      { userId: "u2", user: { id: "u2", fullName: "Admin 2" }, total: 100 },
    ]);

    const result = await reportsService.getSalesByUser({ preset: "hoje" } as never);

    const admin1 = result.items.find((i) => i.userId === "u1");
    expect(admin1?.quantidadeVendas).toBe(2);
    expect(admin1?.faturamento).toBe(80);
    // ordenado por faturamento desc -> Admin 2 (100) deve vir primeiro
    expect(result.items[0].userId).toBe("u2");
  });
});

describe("reports.service — produtos mais vendidos e mais lucrativos", () => {
  const ITEMS = [
    {
      productId: "p1",
      product: { id: "p1", name: "Arroz" },
      quantity: 10,
      returnedQuantity: 0,
      unitPrice: 20,
      unitCost: 18, // margem baixa, mas vende muito
    },
    {
      productId: "p2",
      product: { id: "p2", name: "Vinho" },
      quantity: 2,
      returnedQuantity: 0,
      unitPrice: 100,
      unitCost: 50, // margem alta, mas vende pouco
    },
  ];

  it("ordena 'mais vendidos' por quantidade", async () => {
    prismaMock.saleItem.findMany.mockResolvedValue(ITEMS);

    const result = await reportsService.getMostSoldProducts({ preset: "hoje", limit: 10 } as never);

    expect(result.items[0].productId).toBe("p1"); // 10 unidades > 2 unidades
  });

  it("ordena 'mais lucrativos' por lucro estimado, não por quantidade", async () => {
    prismaMock.saleItem.findMany.mockResolvedValue(ITEMS);

    const result = await reportsService.getMostProfitableProducts({ preset: "hoje", limit: 10 } as never);

    // Arroz: 10*(20-18)=20 de lucro. Vinho: 2*(100-50)=100 de lucro.
    expect(result.items[0].productId).toBe("p2");
    expect(result.items[0].lucroEstimado).toBe(100);
  });

  it("desconsidera itens totalmente devolvidos na agregação", async () => {
    prismaMock.saleItem.findMany.mockResolvedValue([
      { ...ITEMS[0], returnedQuantity: 10 }, // devolvido por completo
      ITEMS[1],
    ]);

    const result = await reportsService.getMostSoldProducts({ preset: "hoje", limit: 10 } as never);

    expect(result.items.find((i) => i.productId === "p1")).toBeUndefined();
    expect(result.items.find((i) => i.productId === "p2")).toBeDefined();
  });
});
