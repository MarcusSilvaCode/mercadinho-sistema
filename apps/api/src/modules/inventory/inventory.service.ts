import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { logAudit } from "../../shared/audit.js";
import type { CountItemInput } from "./inventory.schema.js";

export async function startInventory(userId: string) {
  const inventory = await prisma.inventory.create({ data: { userId } });
  return inventory;
}

export async function getInventory(id: string) {
  const inventory = await prisma.inventory.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { id: true, name: true, sku: true, barcode: true } } } },
    },
  });
  if (!inventory) {
    throw new AppError("Inventário não encontrado.", 404);
  }
  return inventory;
}

/**
 * Registra (ou corrige) a contagem de um produto dentro do inventário.
 * O "estoque esperado" é capturado NA HORA DA CONTAGEM — se o produto for
 * vendido depois, no meio do inventário, a diferença continua correta em
 * relação ao que existia quando o item foi contado.
 */
export async function countItem(inventoryId: string, input: CountItemInput) {
  const inventory = await prisma.inventory.findUnique({ where: { id: inventoryId } });
  if (!inventory) {
    throw new AppError("Inventário não encontrado.", 404);
  }
  if (inventory.finishedAt) {
    throw new AppError("Este inventário já foi finalizado.", 400);
  }

  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) {
    throw new AppError("Produto não encontrado.", 404);
  }

  const expectedQty = product.stockQuantity;
  const difference = input.countedQty - expectedQty;

  const existing = await prisma.inventoryItem.findFirst({
    where: { inventoryId, productId: input.productId },
  });

  const item = existing
    ? await prisma.inventoryItem.update({
        where: { id: existing.id },
        data: { countedQty: input.countedQty, difference },
      })
    : await prisma.inventoryItem.create({
        data: {
          inventoryId,
          productId: input.productId,
          expectedQty,
          countedQty: input.countedQty,
          difference,
        },
      });

  return { ...item, product };
}

/**
 * Aplica todos os ajustes de estoque contados de uma vez, em transação,
 * e fecha o inventário. Itens sem diferença não geram movimentação.
 */
export async function finishInventory(inventoryId: string, userId: string) {
  const inventory = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    include: { items: true },
  });

  if (!inventory) {
    throw new AppError("Inventário não encontrado.", 404);
  }
  if (inventory.finishedAt) {
    throw new AppError("Este inventário já foi finalizado.", 400);
  }
  if (inventory.items.length === 0) {
    throw new AppError("Conte ao menos um produto antes de finalizar o inventário.", 400);
  }

  await prisma.$transaction(async (tx) => {
    for (const item of inventory.items) {
      if (item.difference === 0) continue;

      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      const previousStock = product.stockQuantity;
      const newStock = item.countedQty;

      await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: newStock } });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "INVENTARIO",
          quantity: newStock - previousStock,
          previousStock,
          newStock,
          reason: "Ajuste por inventário",
          sourceType: "Inventory",
          sourceId: inventoryId,
          userId,
        },
      });
    }

    await tx.inventory.update({ where: { id: inventoryId }, data: { finishedAt: new Date() } });
  });

  await logAudit({
    userId,
    action: "INVENTARIO_REALIZADO",
    entity: "Inventory",
    entityId: inventoryId,
    details: { itensContados: inventory.items.length },
  });

  return getInventory(inventoryId);
}
