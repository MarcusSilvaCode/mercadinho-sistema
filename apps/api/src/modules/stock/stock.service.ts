import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { logAudit } from "../../shared/audit.js";
import { EXPIRING_SOON_DAYS } from "../products/products.service.js";
import type { AdjustStockInput, ListMovementsQuery } from "./stock.schema.js";

/**
 * Ajusta o estoque de um produto e registra a movimentação na mesma
 * transação — nunca um sem o outro. `quantity` é o delta (pode ser
 * negativo para reduzir o estoque).
 */
export async function adjustStock(input: AdjustStockInput, userId: string) {
  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) {
    throw new AppError("Produto não encontrado.", 404);
  }

  const previousStock = product.stockQuantity;
  const newStock = previousStock + input.quantity;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id: input.productId },
      data: { stockQuantity: newStock },
    });

    const movement = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        type: "AJUSTE",
        quantity: input.quantity,
        previousStock,
        newStock,
        reason: input.reason,
        sourceType: "Manual",
        userId,
      },
    });

    return { product: updated, movement };
  });

  await logAudit({
    userId,
    action: "AJUSTE_ESTOQUE",
    entity: "Product",
    entityId: input.productId,
    details: { previousStock, newStock, quantity: input.quantity, reason: input.reason },
  });

  return result;
}

export async function listMovements(query: ListMovementsQuery) {
  const { productId, type, page, pageSize } = query;

  const where: Record<string, unknown> = {};
  if (productId) where.productId = productId;
  if (type) where.type = type;

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true, barcode: true } },
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getExpirationAlerts() {
  const now = new Date();
  const limit = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);

  const [expired, expiringSoon] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, expirationDate: { lt: now } },
      orderBy: { expirationDate: "asc" },
    }),
    prisma.product.findMany({
      where: { active: true, expirationDate: { gte: now, lte: limit } },
      orderBy: { expirationDate: "asc" },
    }),
  ]);

  return { expired, expiringSoon, expiringSoonDays: EXPIRING_SOON_DAYS };
}
