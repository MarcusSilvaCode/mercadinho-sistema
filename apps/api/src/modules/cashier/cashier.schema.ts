import { z } from "zod";

export const openCashierSchema = z.object({
  openingAmount: z.coerce.number().nonnegative("Valor inicial não pode ser negativo."),
});

export const cashMovementSchema = z.object({
  type: z.enum(["SANGRIA", "SUPRIMENTO"]),
  amount: z.coerce.number().positive("O valor deve ser maior que zero."),
  reason: z.string().min(3, "Informe o motivo."),
});

export const closeCashierSchema = z.object({
  countedCash: z.coerce.number().nonnegative("Valor contado não pode ser negativo."),
});

export type OpenCashierInput = z.infer<typeof openCashierSchema>;
export type CashMovementInput = z.infer<typeof cashMovementSchema>;
export type CloseCashierInput = z.infer<typeof closeCashierSchema>;
