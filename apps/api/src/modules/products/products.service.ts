import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { logAudit } from "../../shared/audit.js";
import { generateUniqueSku } from "../../shared/sku.js";
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from "./products.schema.js";

export const EXPIRING_SOON_DAYS = 7;

export async function getDefaultMargin(): Promise<number> {
  const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
  return settings ? Number(settings.defaultMargin) : 30;
}

export async function createProduct(input: CreateProductInput, userId: string) {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) {
    throw new AppError("Categoria não encontrada.", 404);
  }

  const sku = input.sku?.trim() || (await generateUniqueSku());
  const profitMargin = input.profitMargin ?? (await getDefaultMargin());

  const product = await prisma.product.create({
    data: {
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      brand: input.brand,
      unit: input.unit,
      costPrice: input.costPrice,
      salePrice: input.salePrice,
      profitMargin,
      stockQuantity: input.stockQuantity,
      minStockQuantity: input.minStockQuantity,
      expirationDate: input.expirationDate,
      batch: input.batch,
      barcode: input.barcode,
      sku,
    },
  });

  await logAudit({
    userId,
    action: "PRODUTO_CRIADO",
    entity: "Product",
    entityId: product.id,
    details: { name: product.name, barcode: product.barcode, sku: product.sku },
  });

  return product;
}

export async function listProducts(query: ListProductsQuery) {
  const { search, categoryId, active, stockStatus, page, pageSize } = query;

  const where: Record<string, unknown> = {};

  if (active !== undefined) where.active = active === "true";
  if (categoryId) where.categoryId = categoryId;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
    ];
  }

  if (stockStatus === "sem_estoque") where.stockQuantity = 0;
  if (stockStatus === "negativo") where.stockQuantity = { lt: 0 };
  if (stockStatus === "vencido") where.expirationDate = { lt: new Date() };
  if (stockStatus === "vencendo") {
    const now = new Date();
    const limit = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);
    where.expirationDate = { gte: now, lte: limit };
  }
  // "baixo" (estoque <= mínimo, mas > 0) precisa comparar duas colunas entre si,
  // o que o Prisma não faz diretamente no `where` — filtramos em memória após buscar.

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
      skip: stockStatus === "baixo" ? undefined : (page - 1) * pageSize,
      take: stockStatus === "baixo" ? undefined : pageSize,
    }),
    stockStatus === "baixo" ? Promise.resolve(0) : prisma.product.count({ where }),
  ]);

  if (stockStatus === "baixo") {
    const filtered = items.filter(
      (p: { stockQuantity: number; minStockQuantity: number }) =>
        p.stockQuantity > 0 && p.stockQuantity <= p.minStockQuantity,
    );
    const start = (page - 1) * pageSize;
    return {
      items: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      pageSize,
    };
  }

  return { items, total, page, pageSize };
}

export async function getProductByBarcode(barcode: string) {
  const product = await prisma.product.findUnique({
    where: { barcode },
    include: { category: { select: { id: true, name: true } } },
  });
  return product; // null é uma resposta válida aqui (controller decide o "produto não cadastrado")
}

export async function updateProduct(id: string, input: UpdateProductInput, userId: string) {
  const current = await prisma.product.findUnique({ where: { id } });
  if (!current) {
    throw new AppError("Produto não encontrado.", 404);
  }

  const priceHistoryEntries: { field: string; oldValue: number; newValue: number }[] = [];

  if (input.costPrice !== undefined && input.costPrice !== Number(current.costPrice)) {
    priceHistoryEntries.push({
      field: "costPrice",
      oldValue: Number(current.costPrice),
      newValue: input.costPrice,
    });
  }
  if (input.salePrice !== undefined && input.salePrice !== Number(current.salePrice)) {
    priceHistoryEntries.push({
      field: "salePrice",
      oldValue: Number(current.salePrice),
      newValue: input.salePrice,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const product = await prisma.$transaction(async (tx: any) => {
    const updated = await tx.product.update({ where: { id }, data: input });

    for (const entry of priceHistoryEntries) {
      await tx.priceHistory.create({
        data: {
          productId: id,
          field: entry.field,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
          userId,
        },
      });
    }

    return updated;
  });

  await logAudit({
    userId,
    action: priceHistoryEntries.length > 0 ? "PRECO_ALTERADO" : "PRODUTO_ALTERADO",
    entity: "Product",
    entityId: product.id,
    details: { alteracoes: input, precos: priceHistoryEntries },
  });

  return product;
}

export async function getPriceHistory(productId: string) {
  return prisma.priceHistory.findMany({
    where: { productId },
    include: { user: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
  });
}
