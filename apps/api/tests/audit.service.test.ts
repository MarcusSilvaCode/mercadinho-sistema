import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = {
  auditLog: { findMany: vi.fn(), count: vi.fn() },
};

vi.mock("../src/config/prisma.js", () => ({ prisma: prismaMock }));

const { listAuditLogs } = await import("../src/modules/audit/audit.service.js");

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.auditLog.findMany.mockResolvedValue([]);
  prismaMock.auditLog.count.mockResolvedValue(0);
});

describe("audit.service — listAuditLogs", () => {
  it("sem filtros, consulta sem restrição de where e ordena por data decrescente", async () => {
    await listAuditLogs({ page: 1, pageSize: 30 } as never);

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, orderBy: { createdAt: "desc" } }),
    );
  });

  it("filtra por usuário quando userId é informado", async () => {
    await listAuditLogs({ userId: "user-1", page: 1, pageSize: 30 } as never);

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
  });

  it("filtra por ação quando action é informado", async () => {
    await listAuditLogs({ action: "VENDA_CANCELADA", page: 1, pageSize: 30 } as never);

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { action: "VENDA_CANCELADA" } }),
    );
  });

  it("filtra por entidade quando entity é informado", async () => {
    await listAuditLogs({ entity: "Product", page: 1, pageSize: 30 } as never);

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { entity: "Product" } }),
    );
  });

  it("aplica intervalo de datas quando from e to são informados juntos", async () => {
    const from = new Date(2026, 0, 10);
    const to = new Date(2026, 0, 12);

    await listAuditLogs({ from, to, page: 1, pageSize: 30 } as never);

    const call = prismaMock.auditLog.findMany.mock.calls[0][0];
    expect(call.where.createdAt.gte.getDate()).toBe(10);
    expect(call.where.createdAt.lt.getDate()).toBe(13); // exclusivo, cobre até o fim do dia 12
  });

  it("combina múltiplos filtros na mesma consulta", async () => {
    await listAuditLogs({ userId: "user-1", action: "PRECO_ALTERADO", entity: "Product", page: 1, pageSize: 30 } as never);

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", action: "PRECO_ALTERADO", entity: "Product" },
      }),
    );
  });

  it("pagina corretamente (skip/take a partir de page e pageSize)", async () => {
    await listAuditLogs({ page: 3, pageSize: 20 } as never);

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 }),
    );
  });

  it("retorna o total vindo de count, não do tamanho da página atual", async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([{ id: "1" }, { id: "2" }]);
    prismaMock.auditLog.count.mockResolvedValue(157);

    const result = await listAuditLogs({ page: 1, pageSize: 2 } as never);

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(157);
  });
});
