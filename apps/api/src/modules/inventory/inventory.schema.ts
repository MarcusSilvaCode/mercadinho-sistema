import { z } from "zod";

export const countItemSchema = z.object({
  productId: z.string().uuid("Produto inválido."),
  countedQty: z.number().int().nonnegative("Quantidade contada não pode ser negativa."),
});

export type CountItemInput = z.infer<typeof countItemSchema>;
