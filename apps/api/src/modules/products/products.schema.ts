import { z } from "zod";

const unitEnum = z.enum(["UN", "CX", "FD", "PCT", "L", "ML", "G", "KG"]);

export const createProductSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres."),
  description: z.string().optional(),
  categoryId: z.string().uuid("Categoria inválida."),
  brand: z.string().optional(),
  unit: unitEnum.default("UN"),
  costPrice: z.coerce.number().nonnegative("Preço de custo não pode ser negativo."),
  salePrice: z.coerce.number().nonnegative("Preço de venda não pode ser negativo."),
  profitMargin: z.coerce.number().optional(), // se omitido, herda a margem padrão da loja
  stockQuantity: z.coerce.number().int().default(0),
  minStockQuantity: z.coerce.number().int().nonnegative().default(0),
  expirationDate: z.coerce.date().optional(),
  batch: z.string().optional(),
  barcode: z.string().min(1, "Código de barras é obrigatório."),
  sku: z.string().optional(), // se omitido, é gerado automaticamente
});

export const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  brand: z.string().optional(),
  unit: unitEnum.optional(),
  costPrice: z.coerce.number().nonnegative().optional(),
  salePrice: z.coerce.number().nonnegative().optional(),
  profitMargin: z.coerce.number().optional(),
  minStockQuantity: z.coerce.number().int().nonnegative().optional(),
  expirationDate: z.coerce.date().nullable().optional(),
  batch: z.string().optional(),
  barcode: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

export const listProductsQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  active: z.enum(["true", "false"]).optional(),
  stockStatus: z.enum(["baixo", "sem_estoque", "negativo", "vencendo", "vencido"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
