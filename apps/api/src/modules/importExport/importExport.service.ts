import ExcelJS from "exceljs";
import { prisma } from "../../config/prisma.js";
import { logAudit } from "../../shared/audit.js";
import { generateUniqueSku } from "../../shared/sku.js";
import { getDefaultMargin } from "../products/products.service.js";
import {
  parseFile,
  validateRow,
  type ParsedProductRow,
  type ValidationContext,
} from "./importExport.parser.js";

async function buildValidationContext(): Promise<ValidationContext> {
  const [categories, products, defaultMargin] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.product.findMany({ select: { barcode: true, sku: true } }),
    getDefaultMargin(),
  ]);

  return {
    categoryByName: new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id])),
    existingBarcodes: new Set(products.map((p) => p.barcode)),
    existingSkus: new Set(products.map((p) => p.sku)),
    seenBarcodesInFile: new Set(),
    seenSkusInFile: new Set(),
    defaultMargin,
  };
}

export async function previewImport(buffer: Buffer, filename: string) {
  const rows = await parseFile(buffer, filename);
  if (rows.length === 0) {
    return { rows: [], summary: { total: 0, valid: 0, invalid: 0 } };
  }

  const context = await buildValidationContext();
  const validated = rows.map((row) => validateRow(row, context));

  const valid = validated.filter((r) => r.errors.length === 0).length;

  return {
    rows: validated,
    summary: { total: validated.length, valid, invalid: validated.length - valid },
  };
}

interface CommitResult {
  rowIndex: number;
  name: string;
  status: "created" | "error";
  error?: string;
}

/**
 * Revalida cada linha contra o estado FRESCO do banco (nunca confia na
 * validação da prévia, que pode estar desatualizada se outra importação
 * ou cadastro aconteceu nesse meio-tempo) e insere uma a uma — uma linha
 * com erro não impede as demais de serem importadas.
 */
export async function commitImport(rows: ParsedProductRow[], userId: string) {
  const context = await buildValidationContext();
  const results: CommitResult[] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: string[] = [];

    const categoryId = context.categoryByName.get(row.categoryName.trim().toLowerCase());
    if (!categoryId) errors.push(`Categoria não encontrada: "${row.categoryName}".`);

    if (context.existingBarcodes.has(row.barcode)) {
      errors.push(`Código de barras já cadastrado: "${row.barcode}".`);
    } else if (context.seenBarcodesInFile.has(row.barcode)) {
      errors.push(`Código de barras duplicado no lote: "${row.barcode}".`);
    }

    if (row.sku) {
      if (context.existingSkus.has(row.sku)) {
        errors.push(`SKU já cadastrado: "${row.sku}".`);
      } else if (context.seenSkusInFile.has(row.sku)) {
        errors.push(`SKU duplicado no lote: "${row.sku}".`);
      }
    }

    if (errors.length > 0) {
      results.push({ rowIndex: i, name: row.name, status: "error", error: errors.join(" ") });
      continue;
    }

    const sku = row.sku || (await generateUniqueSku());

    await prisma.product.create({
      data: {
        name: row.name,
        description: row.description,
        categoryId: categoryId!,
        brand: row.brand,
        unit: row.unit as never,
        costPrice: row.costPrice,
        salePrice: row.salePrice,
        profitMargin: row.profitMargin ?? context.defaultMargin,
        stockQuantity: row.stockQuantity,
        minStockQuantity: row.minStockQuantity,
        expirationDate: row.expirationDate,
        batch: row.batch,
        barcode: row.barcode,
        sku,
      },
    });

    context.existingBarcodes.add(row.barcode);
    context.existingSkus.add(sku);
    created++;
    results.push({ rowIndex: i, name: row.name, status: "created" });
  }

  await logAudit({
    userId,
    action: "IMPORTACAO_PRODUTOS",
    details: { total: rows.length, created, skipped: rows.length - created },
  });

  return { created, skipped: rows.length - created, results };
}

const EXPORT_HEADERS = [
  "nome",
  "descricao",
  "categoria",
  "marca",
  "unidade",
  "preco_custo",
  "preco_venda",
  "margem_lucro",
  "estoque_atual",
  "estoque_minimo",
  "validade",
  "lote",
  "codigo_barras",
  "sku",
];

export async function exportProducts(): Promise<Buffer> {
  const products = await prisma.product.findMany({
    include: { category: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Produtos");
  sheet.addRow(EXPORT_HEADERS);

  for (const p of products) {
    sheet.addRow([
      p.name,
      p.description ?? "",
      p.category.name,
      p.brand ?? "",
      p.unit,
      Number(p.costPrice),
      Number(p.salePrice),
      Number(p.profitMargin),
      p.stockQuantity,
      p.minStockQuantity,
      p.expirationDate ? p.expirationDate.toISOString().slice(0, 10) : "",
      p.batch ?? "",
      p.barcode,
      p.sku,
    ]);
  }

  sheet.columns.forEach((col) => (col.width = 18));

  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
}

export async function generateImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Produtos");
  sheet.addRow(EXPORT_HEADERS);
  sheet.addRow([
    "Arroz 5kg",
    "Arroz branco tipo 1",
    "Mercearia",
    "Marca Exemplo",
    "UN",
    20,
    25,
    25,
    50,
    5,
    "",
    "",
    "7891000000001",
    "",
  ]);
  sheet.columns.forEach((col) => (col.width = 18));

  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
}
