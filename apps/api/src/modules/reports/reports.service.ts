import { prisma } from "../../config/prisma.js";
import { round2 } from "../../shared/money.js";
import { resolveDateRange } from "../../shared/dateRanges.js";
import type { PeriodQuery, TopProductsQuery } from "./reports.schema.js";

const ACTIVE_SALE_STATUSES = ["CONCLUIDA", "DEVOLVIDA_PARCIAL", "DEVOLVIDA_TOTAL"] as const;

function periodToRange(query: PeriodQuery) {
  return resolveDateRange({ preset: query.preset, from: query.from, to: query.to });
}

/**
 * Núcleo financeiro compartilhado: faturamento bruto, descontos (rateados
 * por item ativo), faturamento líquido, custo dos produtos vendidos e
 * lucro estimado — para qualquer intervalo de datas. O Dashboard (Fase 11)
 * usa esta mesma função passando o intervalo de "hoje", evitando duplicar
 * a lógica de cálculo em dois lugares.
 */
export async function getSalesSummary(start: Date, end: Date) {
  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: start, lt: end }, status: { in: [...ACTIVE_SALE_STATUSES] } },
    include: { items: true },
  });

  let grossRevenue = 0;
  let totalCost = 0;
  let discountApplied = 0;

  for (const sale of sales) {
    const saleSubtotal = Number(sale.subtotal);
    let activeSubtotal = 0;

    for (const item of sale.items) {
      const activeQty = item.quantity - item.returnedQuantity;
      const itemRevenue = activeQty * Number(item.unitPrice);
      const itemCost = activeQty * Number(item.unitCost);
      grossRevenue += itemRevenue;
      totalCost += itemCost;
      activeSubtotal += itemRevenue;
    }

    const saleDiscount = Number(sale.discountValue);
    const proratedDiscount = saleSubtotal > 0 ? saleDiscount * (activeSubtotal / saleSubtotal) : 0;
    discountApplied += proratedDiscount;
  }

  const faturamentoBruto = round2(grossRevenue);
  const descontos = round2(discountApplied);
  const faturamentoLiquido = round2(grossRevenue - discountApplied);
  const cpv = round2(totalCost);
  const lucroEstimado = round2(grossRevenue - totalCost - discountApplied);
  const quantidadeVendas = sales.length;
  const ticketMedio = quantidadeVendas > 0 ? round2(faturamentoLiquido / quantidadeVendas) : 0;

  return { faturamentoBruto, descontos, faturamentoLiquido, cpv, lucroEstimado, quantidadeVendas, ticketMedio };
}

export async function getFinancialReport(query: PeriodQuery) {
  const { start, end } = periodToRange(query);
  const summary = await getSalesSummary(start, end);
  return { period: { start, end }, ...summary };
}

export async function getSalesByPayment(query: PeriodQuery) {
  const { start, end } = periodToRange(query);

  const payments = await prisma.payment.findMany({
    where: { sale: { createdAt: { gte: start, lt: end }, status: { in: [...ACTIVE_SALE_STATUSES] } } },
  });

  const totals = { DINHEIRO: 0, PIX: 0, DEBITO: 0, CREDITO: 0 };
  for (const payment of payments) {
    totals[payment.method] += Number(payment.amount);
  }

  return {
    period: { start, end },
    items: Object.entries(totals).map(([method, total]) => ({ method, total: round2(total) })),
  };
}

export async function getSalesByUser(query: PeriodQuery) {
  const { start, end } = periodToRange(query);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: start, lt: end }, status: { in: [...ACTIVE_SALE_STATUSES] } },
    include: { user: { select: { id: true, fullName: true } } },
  });

  const byUser = new Map<string, { userId: string; fullName: string; quantidadeVendas: number; faturamento: number }>();

  for (const sale of sales) {
    const entry = byUser.get(sale.userId) ?? {
      userId: sale.userId,
      fullName: sale.user.fullName,
      quantidadeVendas: 0,
      faturamento: 0,
    };
    entry.quantidadeVendas += 1;
    entry.faturamento = round2(entry.faturamento + Number(sale.total));
    byUser.set(sale.userId, entry);
  }

  return {
    period: { start, end },
    items: Array.from(byUser.values()).sort((a, b) => b.faturamento - a.faturamento),
  };
}

interface ProductAggregate {
  productId: string;
  name: string;
  quantidadeVendida: number;
  faturamento: number;
  lucroEstimado: number;
}

async function aggregateByProduct(start: Date, end: Date): Promise<ProductAggregate[]> {
  const items = await prisma.saleItem.findMany({
    where: { sale: { createdAt: { gte: start, lt: end }, status: { in: [...ACTIVE_SALE_STATUSES] } } },
    include: { product: { select: { id: true, name: true } } },
  });

  const byProduct = new Map<string, ProductAggregate>();

  for (const item of items) {
    const activeQty = item.quantity - item.returnedQuantity;
    if (activeQty <= 0) continue;

    const revenue = activeQty * Number(item.unitPrice);
    const cost = activeQty * Number(item.unitCost);

    const entry = byProduct.get(item.productId) ?? {
      productId: item.productId,
      name: item.product.name,
      quantidadeVendida: 0,
      faturamento: 0,
      lucroEstimado: 0,
    };
    entry.quantidadeVendida += activeQty;
    entry.faturamento = round2(entry.faturamento + revenue);
    entry.lucroEstimado = round2(entry.lucroEstimado + (revenue - cost));
    byProduct.set(item.productId, entry);
  }

  return Array.from(byProduct.values());
}

export async function getSalesByProduct(query: PeriodQuery) {
  const { start, end } = periodToRange(query);
  const items = await aggregateByProduct(start, end);
  return {
    period: { start, end },
    items: items.sort((a, b) => b.quantidadeVendida - a.quantidadeVendida),
  };
}

export async function getMostSoldProducts(query: TopProductsQuery) {
  const { start, end } = periodToRange(query);
  const items = await aggregateByProduct(start, end);
  return {
    period: { start, end },
    items: items.sort((a, b) => b.quantidadeVendida - a.quantidadeVendida).slice(0, query.limit),
  };
}

export async function getMostProfitableProducts(query: TopProductsQuery) {
  const { start, end } = periodToRange(query);
  const items = await aggregateByProduct(start, end);
  return {
    period: { start, end },
    items: items.sort((a, b) => b.lucroEstimado - a.lucroEstimado).slice(0, query.limit),
  };
}
