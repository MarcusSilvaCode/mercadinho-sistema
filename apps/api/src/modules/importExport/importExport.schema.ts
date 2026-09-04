import { z } from "zod";
import { VALID_UNITS } from "./importExport.parser.js";

const importRowSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  categoryName: z.string().min(1),
  brand: z.string().optional(),
  unit: z.enum(VALID_UNITS),
  costPrice: z.number().nonnegative(),
  salePrice: z.number().nonnegative(),
  profitMargin: z.number().optional(),
  stockQuantity: z.number().int(),
  minStockQuantity: z.number().int().nonnegative(),
  expirationDate: z.coerce.date().optional(),
  batch: z.string().optional(),
  barcode: z.string().min(1),
  sku: z.string().optional(),
});

export const commitImportSchema = z.object({
  rows: z.array(importRowSchema).min(1, "Nenhuma linha válida para importar."),
});

export type CommitImportInput = z.infer<typeof commitImportSchema>;
