import { z } from "zod";

export const adjustStockSchema = z.object({
  productId: z.string().uuid("Produto inválido."),
  quantity: z
    .number()
    .int()
    .refine((v) => v !== 0, "A quantidade do ajuste não pode ser zero."),
  reason: z.string().min(3, "Informe o motivo do ajuste."),
});

export const listMovementsQuerySchema = z.object({
  productId: z.string().uuid().optional(),
  type: z
    .enum(["ENTRADA", "VENDA", "CANCELAMENTO", "DEVOLUCAO", "AJUSTE", "INVENTARIO"])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;
