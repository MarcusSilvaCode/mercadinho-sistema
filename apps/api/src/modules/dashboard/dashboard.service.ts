import { prisma } from "../../config/prisma.js";
import { EXPIRING_SOON_DAYS } from "../products/products.service.js";
import { getCurrentSession } from "../cashier/cashier.service.js";
import { getSalesSummary } from "../reports/reports.service.js";
import { getLastBackup } from "../backup/backup.service.js";

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/**
 * Faturamento (líquido), lucro estimado e ticket médio de hoje.
 * Reaproveita o mesmo núcleo de cálculo do módulo de Relatórios (Fase 12)
 * — o Dashboard é só "Relatórios com período fixo em hoje".
 */
async function getTodaySummary() {
  const { start, end } = getTodayRange();
  const summary = await getSalesSummary(start, end);

  return {
    faturamento: summary.faturamentoLiquido,
    quantidadeVendas: summary.quantidadeVendas,
    lucroEstimado: summary.lucroEstimado,
    ticketMedio: summary.ticketMedio,
  };
}

/**
 * Contagens de estoque, reaproveitando a mesma regra de "baixo" usada
 * na listagem de produtos (Fases 5/6): estoque > 0 e <= mínimo.
 */
async function getStockSummary() {
  const products = await prisma.product.findMany({
    where: { active: true },
    select: { stockQuantity: true, minStockQuantity: true },
  });

  const totalProdutos = products.length;
  const semEstoque = products.filter((p) => p.stockQuantity === 0).length;
  const estoqueNegativo = products.filter((p) => p.stockQuantity < 0).length;
  const estoqueBaixo = products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.minStockQuantity).length;

  const now = new Date();
  const limit = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);

  const [vencidos, vencendoEmBreve] = await Promise.all([
    prisma.product.count({ where: { active: true, expirationDate: { lt: now } } }),
    prisma.product.count({ where: { active: true, expirationDate: { gte: now, lte: limit } } }),
  ]);

  return { totalProdutos, estoqueBaixo, semEstoque, estoqueNegativo, vencendoEmBreve, vencidos };
}

export async function getDashboardSummary() {
  const [today, estoque, cashierResult, lastBackup] = await Promise.all([
    getTodaySummary(),
    getStockSummary(),
    getCurrentSession(),
    getLastBackup(),
  ]);

  const caixa = cashierResult
    ? {
        status: "ABERTO" as const,
        openingAmount: Number(cashierResult.session.openingAmount),
        ...cashierResult.totals,
      }
    : { status: "FECHADO" as const };

  const alertas = {
    estoqueBaixo: estoque.estoqueBaixo > 0,
    semEstoque: estoque.semEstoque > 0,
    estoqueNegativo: estoque.estoqueNegativo > 0,
    produtosVencidos: estoque.vencidos > 0,
    produtosVencendo: estoque.vencendoEmBreve > 0,
    backup: lastBackup?.status === "FALHA",
  };

  return { today, estoque, caixa, alertas };
}
