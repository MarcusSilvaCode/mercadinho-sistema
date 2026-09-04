import { z } from "zod";

const purchaseItemSchema = z.object({
  productId: z.string().uuid("Produto inválido."),
  quantity: z.coerce.number().int().positive("Quantidade deve ser maior que zero."),
  unitCost: z.coerce.number().nonnegative("Custo unitário não pode ser negativo."),
  batch: z.string().optional(),
  expirationDate: z.coerce.date().optional(),
});

export const createPurchaseSchema = z.object({
  items: z.array(purchaseItemSchema).min(1, "Informe ao menos um produto na entrada."),
});

export const listPurchasesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>;
export type ListPurchasesQuery = z.infer<typeof listPurchasesQuerySchema>;
