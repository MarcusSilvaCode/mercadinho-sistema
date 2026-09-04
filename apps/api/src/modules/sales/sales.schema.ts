import { z } from "zod";

const saleItemSchema = z.object({
  productId: z.string().uuid("Produto inválido."),
  quantity: z.number().int().positive("Quantidade deve ser maior que zero."),
});

const paymentSchema = z.object({
  method: z.enum(["DINHEIRO", "PIX", "DEBITO", "CREDITO"]),
  amount: z.number().positive("O valor do pagamento deve ser maior que zero."),
});

export const createSaleSchema = z
  .object({
    items: z.array(saleItemSchema).min(1, "Adicione ao menos um produto à venda."),
    discountValue: z.number().nonnegative().optional(),
    discountPercent: z.number().nonnegative().optional(),
    payments: z.array(paymentSchema).min(1, "Informe ao menos uma forma de pagamento."),
    receivedAmount: z.number().nonnegative().optional(),
    stockOverrideConfirmed: z.boolean().default(false),
  })
  .refine((data) => !(data.discountValue !== undefined && data.discountPercent !== undefined), {
    message: "Informe o desconto por valor OU por porcentagem, nunca os dois.",
    path: ["discountValue"],
  });

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const cancelSaleSchema = z.object({
  reason: z.string().min(3, "Informe o motivo do cancelamento."),
});

export const returnSaleSchema = z.object({
  items: z
    .array(
      z.object({
        saleItemId: z.string().uuid("Item inválido."),
        quantity: z.number().int().positive("Quantidade deve ser maior que zero."),
      }),
    )
    .min(1, "Informe ao menos um item para devolver."),
  reason: z.string().min(3, "Informe o motivo da devolução."),
});

export const listSalesQuerySchema = z.object({
  number: z.coerce.number().int().positive().optional(),
  status: z.enum(["CONCLUIDA", "CANCELADA", "DEVOLVIDA_PARCIAL", "DEVOLVIDA_TOTAL"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CancelSaleInput = z.infer<typeof cancelSaleSchema>;
export type ReturnSaleInput = z.infer<typeof returnSaleSchema>;
export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>;
