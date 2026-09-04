import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { logAudit } from "../../shared/audit.js";
import { suggestSalePrice } from "../../shared/pricing.js";
import type { CreatePurchaseInput, ListPurchasesQuery } from "./purchases.schema.js";

interface LineResult {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  previousCost: number;
  newStock: number;
  suggestedSalePrice: number;
}

/**
 * Registra uma entrada de mercadorias inteira em uma única transação:
 * soma ao estoque, substitui o preço de custo (sem custo médio) e grava
 * o histórico de preço quando o custo muda. Se qualquer linha referenciar
 * um produto inexistente, tudo é revertido.
 */
export async function createPurchase(input: CreatePurchaseInput, userId: string) {
  const total = input.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  const { purchase, lines } = await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: { userId, totalValue: total },
    });

    const lines: LineResult[] = [];

    for (const item of input.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw new AppError(`Produto não encontrado (id: ${item.productId}).`, 404);
      }

      const previousStock = product.stockQuantity;
      const newStock = previousStock + item.quantity;
      const previousCost = Number(product.costPrice);
      const costChanged = item.unitCost !== previousCost;

      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: newStock,
          costPrice: item.unitCost,
          ...(item.batch ? { batch: item.batch } : {}),
          ...(item.expirationDate ? { expirationDate: item.expirationDate } : {}),
        },
      });

      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          batch: item.batch,
          expirationDate: item.expirationDate,
          total: item.quantity * item.unitCost,
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "ENTRADA",
          quantity: item.quantity,
          previousStock,
          newStock,
          sourceType: "Purchase",
          sourceId: purchase.id,
          userId,
        },
      });

      if (costChanged) {
        await tx.priceHistory.create({
          data: {
            productId: item.productId,
            field: "costPrice",
            oldValue: previousCost,
            newValue: item.unitCost,
            userId,
          },
        });
      }

      lines.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitCost: item.unitCost,
        previousCost,
        newStock,
        suggestedSalePrice: suggestSalePrice(item.unitCost, Number(product.profitMargin)),
      });
    }

    return { purchase, lines };
  });

  await logAudit({
    userId,
    action: "ENTRADA_ESTOQUE",
    entity: "Purchase",
    entityId: purchase.id,
    details: { itens: lines.length, total },
  });

  return { purchase, lines, total };
}

export async function listPurchases(query: ListPurchasesQuery) {
  const { page, pageSize } = query;

  const [items, total] = await Promise.all([
    prisma.purchase.findMany({
      include: {
        user: { select: { fullName: true } },
        items: { include: { product: { select: { name: true, sku: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.purchase.count(),
  ]);

  return { items, total, page, pageSize };
}

export async function getPurchase(id: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      user: { select: { fullName: true } },
      items: { include: { product: { select: { name: true, sku: true, barcode: true } } } },
    },
  });
  if (!purchase) {
    throw new AppError("Entrada não encontrada.", 404);
  }
  return purchase;
}
