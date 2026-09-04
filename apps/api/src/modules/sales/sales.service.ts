import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { logAudit } from "../../shared/audit.js";
import { round2 } from "../../shared/money.js";
import type { CancelSaleInput, CreateSaleInput, ListSalesQuery, ReturnSaleInput } from "./sales.schema.js";

async function getMaxDiscountPercent(): Promise<number> {
  const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
  return settings ? Number(settings.maxDiscountPercent) : 30;
}

interface LineDraft {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
  previousStock: number;
  newStock: number;
  soldWithoutStock: boolean;
}

/**
 * Finaliza uma venda inteira em uma única transação: valida caixa aberto,
 * congela preço/custo de cada item, calcula desconto e total, valida que
 * os pagamentos somam exatamente o total, calcula o troco, decrementa
 * estoque linha a linha e grava tudo — ou nada, em caso de erro.
 */
export async function createSale(input: CreateSaleInput, userId: string) {
  const openSession = await prisma.cashierSession.findFirst({ where: { status: "ABERTO" } });
  if (!openSession) {
    throw new AppError("Não há caixa aberto. Abra o caixa antes de iniciar uma venda.", 400);
  }

  const maxDiscountPercent = await getMaxDiscountPercent();

  const result = await prisma.$transaction(async (tx) => {
    const lines: LineDraft[] = [];
    let subtotal = 0;

    for (const item of input.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw new AppError(`Produto não encontrado (id: ${item.productId}).`, 404);
      }
      if (!product.active) {
        throw new AppError(`Produto inativo: ${product.name}.`, 400);
      }

      const unitPrice = Number(product.salePrice);
      const unitCost = Number(product.costPrice);
      const lineSubtotal = round2(item.quantity * unitPrice);
      subtotal = round2(subtotal + lineSubtotal);

      const previousStock = product.stockQuantity;
      const newStock = previousStock - item.quantity;
      const soldWithoutStock = newStock < 0;

      if (soldWithoutStock && !input.stockOverrideConfirmed) {
        throw new AppError(
          `Produto sem estoque suficiente: ${product.name}. É necessária autorização de administrador.`,
          409,
        );
      }

      lines.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        unitCost,
        subtotal: lineSubtotal,
        previousStock,
        newStock,
        soldWithoutStock,
      });
    }

    // --- Desconto: por valor OU por porcentagem, sempre limitado à margem da loja ---
    let discountValue = 0;
    let discountPercent: number | null = null;

    if (input.discountPercent !== undefined) {
      if (input.discountPercent > maxDiscountPercent) {
        throw new AppError(`Desconto máximo permitido é ${maxDiscountPercent}%.`, 400);
      }
      discountPercent = input.discountPercent;
      discountValue = round2(subtotal * (input.discountPercent / 100));
    } else if (input.discountValue !== undefined) {
      const equivalentPercent = subtotal > 0 ? (input.discountValue / subtotal) * 100 : 0;
      if (equivalentPercent > maxDiscountPercent + 0.01) {
        throw new AppError(`Desconto máximo permitido é ${maxDiscountPercent}%.`, 400);
      }
      discountValue = input.discountValue;
    }

    const total = round2(subtotal - discountValue);

    // --- Pagamento: a soma deve bater exatamente com o total ---
    const paymentsSum = round2(input.payments.reduce((sum, p) => sum + p.amount, 0));
    if (Math.abs(paymentsSum - total) > 0.01) {
      throw new AppError(
        `A soma dos pagamentos (${paymentsSum.toFixed(2)}) deve ser igual ao total da venda (${total.toFixed(2)}).`,
        400,
      );
    }

    // --- Troco: calculado a partir da parcela em dinheiro, nunca confiado do frontend ---
    const cashPortion = round2(
      input.payments.filter((p) => p.method === "DINHEIRO").reduce((sum, p) => sum + p.amount, 0),
    );
    let receivedAmount: number | null = null;
    let changeAmount: number | null = null;

    if (cashPortion > 0) {
      receivedAmount = input.receivedAmount ?? cashPortion;
      if (receivedAmount < cashPortion) {
        throw new AppError("Valor recebido em dinheiro é menor que o valor devido em dinheiro.", 400);
      }
      changeAmount = round2(receivedAmount - cashPortion);
    }

    const sale = await tx.sale.create({
      data: {
        cashierSessionId: openSession.id,
        userId,
        subtotal,
        discountValue,
        discountPercent,
        total,
        receivedAmount,
        changeAmount,
        status: "CONCLUIDA",
      },
    });

    for (const line of lines) {
      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          unitCost: line.unitCost,
          subtotal: line.subtotal,
          soldWithoutStock: line.soldWithoutStock,
        },
      });

      await tx.product.update({ where: { id: line.productId }, data: { stockQuantity: line.newStock } });

      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          type: "VENDA",
          quantity: -line.quantity,
          previousStock: line.previousStock,
          newStock: line.newStock,
          sourceType: "Sale",
          sourceId: sale.id,
          userId,
        },
      });
    }

    for (const payment of input.payments) {
      await tx.payment.create({
        data: { saleId: sale.id, method: payment.method, amount: payment.amount },
      });
    }

    return { sale, lines, subtotal, discountValue, discountPercent, total, receivedAmount, changeAmount };
  });

  await logAudit({
    userId,
    action: "VENDA_CRIADA",
    entity: "Sale",
    entityId: result.sale.id,
    details: { total: result.total, itens: result.lines.length },
  });

  if (result.discountValue > 0) {
    await logAudit({
      userId,
      action: "DESCONTO_APLICADO",
      entity: "Sale",
      entityId: result.sale.id,
      details: { discountValue: result.discountValue, discountPercent: result.discountPercent },
    });
  }

  for (const line of result.lines) {
    if (line.soldWithoutStock) {
      await logAudit({
        userId,
        action: "VENDA_SEM_ESTOQUE_AUTORIZADA",
        entity: "Product",
        entityId: line.productId,
        details: { saleId: result.sale.id, quantity: line.quantity, newStock: line.newStock },
      });
    }
  }

  return result;
}

export async function getSale(id: string) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { name: true, sku: true, barcode: true, unit: true } } } },
      payments: true,
      user: { select: { fullName: true } },
    },
  });
  if (!sale) {
    throw new AppError("Venda não encontrada.", 404);
  }
  return sale;
}

export async function listSales(query: ListSalesQuery) {
  const { number, status, page, pageSize } = query;

  const where: Record<string, unknown> = {};
  if (number) where.number = number;
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { user: { select: { fullName: true } }, items: true, payments: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sale.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

/**
 * Cancela a venda inteira: só permitido enquanto CONCLUIDA. Devolve o
 * estoque de todos os itens numa única transação e marca a venda como
 * CANCELADA — ela nunca é apagada, continua no histórico.
 */
export async function cancelSale(saleId: string, input: CancelSaleInput, userId: string) {
  const sale = await prisma.sale.findUnique({ where: { id: saleId }, include: { items: true } });
  if (!sale) {
    throw new AppError("Venda não encontrada.", 404);
  }
  if (sale.status !== "CONCLUIDA") {
    throw new AppError(`Esta venda não pode ser cancelada (status atual: ${sale.status}).`, 400);
  }

  await prisma.$transaction(async (tx) => {
    for (const item of sale.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      const previousStock = product.stockQuantity;
      const newStock = previousStock + item.quantity;

      await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: newStock } });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "CANCELAMENTO",
          quantity: item.quantity,
          previousStock,
          newStock,
          reason: input.reason,
          sourceType: "Sale",
          sourceId: sale.id,
          userId,
        },
      });
    }

    await tx.sale.update({
      where: { id: saleId },
      data: { status: "CANCELADA", cancelReason: input.reason },
    });
  });

  await logAudit({
    userId,
    action: "VENDA_CANCELADA",
    entity: "Sale",
    entityId: saleId,
    details: { reason: input.reason, itens: sale.items.length },
  });

  return getSale(saleId);
}

/**
 * Devolve um ou mais itens de uma venda concluída (ou já parcialmente
 * devolvida). Valida que a quantidade pedida não excede o que ainda pode
 * ser devolvido em cada item, devolve o estoque, e recalcula o status da
 * venda (DEVOLVIDA_PARCIAL ou DEVOLVIDA_TOTAL) a partir do estado real
 * de todos os itens após a operação.
 */
export async function returnSale(saleId: string, input: ReturnSaleInput, userId: string) {
  const sale = await prisma.sale.findUnique({ where: { id: saleId }, include: { items: true } });
  if (!sale) {
    throw new AppError("Venda não encontrada.", 404);
  }
  if (sale.status === "CANCELADA" || sale.status === "DEVOLVIDA_TOTAL") {
    throw new AppError(`Esta venda não admite mais devoluções (status atual: ${sale.status}).`, 400);
  }

  // Valida ANTES de tocar no banco: nenhuma linha pode devolver mais do
  // que ainda resta, para toda a operação falhar de forma limpa.
  for (const requested of input.items) {
    const saleItem = sale.items.find((i) => i.id === requested.saleItemId);
    if (!saleItem) {
      throw new AppError(`Item de venda não encontrado (id: ${requested.saleItemId}).`, 404);
    }
    const remaining = saleItem.quantity - saleItem.returnedQuantity;
    if (requested.quantity > remaining) {
      throw new AppError(
        `Quantidade a devolver (${requested.quantity}) excede o que ainda pode ser devolvido (${remaining}).`,
        400,
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const requested of input.items) {
      const saleItem = sale.items.find((i) => i.id === requested.saleItemId)!;
      const newReturnedQuantity = saleItem.returnedQuantity + requested.quantity;

      await tx.saleItem.update({
        where: { id: saleItem.id },
        data: {
          returnedQuantity: newReturnedQuantity,
          returned: newReturnedQuantity >= saleItem.quantity,
        },
      });

      const product = await tx.product.findUnique({ where: { id: saleItem.productId } });
      if (!product) continue;

      const previousStock = product.stockQuantity;
      const newStock = previousStock + requested.quantity;

      await tx.product.update({ where: { id: saleItem.productId }, data: { stockQuantity: newStock } });

      await tx.stockMovement.create({
        data: {
          productId: saleItem.productId,
          type: "DEVOLUCAO",
          quantity: requested.quantity,
          previousStock,
          newStock,
          reason: input.reason,
          sourceType: "Sale",
          sourceId: sale.id,
          userId,
        },
      });
    }

    const updatedItems = await tx.saleItem.findMany({ where: { saleId } });
    const allFullyReturned = updatedItems.every((i) => i.returnedQuantity >= i.quantity);

    await tx.sale.update({
      where: { id: saleId },
      data: { status: allFullyReturned ? "DEVOLVIDA_TOTAL" : "DEVOLVIDA_PARCIAL" },
    });
  });

  await logAudit({
    userId,
    action: "VENDA_DEVOLVIDA",
    entity: "Sale",
    entityId: saleId,
    details: { reason: input.reason, itens: input.items },
  });

  return getSale(saleId);
}
