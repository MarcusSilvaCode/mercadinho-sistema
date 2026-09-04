import ExcelJS from "exceljs";
import { Readable } from "node:stream";

export const VALID_UNITS = ["UN", "CX", "FD", "PCT", "L", "ML", "G", "KG"] as const;

// Cabeçalhos esperados na planilha — em português, casando com a terminologia
// da especificação (seção 13). Comparação é case-insensitive e ignora espaços.
const REQUIRED_HEADERS = ["nome", "categoria", "unidade", "preco_custo", "preco_venda", "codigo_barras"];
const OPTIONAL_HEADERS = ["descricao", "marca", "margem_lucro", "estoque_atual", "estoque_minimo", "validade", "lote", "sku"];
const ALL_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];

export interface RawImportRow {
  rowNumber: number;
  values: Record<string, string>;
}

export interface ParsedProductRow {
  name: string;
  description?: string;
  categoryName: string;
  brand?: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  profitMargin?: number;
  stockQuantity: number;
  minStockQuantity: number;
  expirationDate?: Date;
  batch?: string;
  barcode: string;
  sku?: string;
}

export interface ValidatedImportRow {
  rowNumber: number;
  data: ParsedProductRow | null;
  errors: string[];
}

/** Lê o arquivo (buffer) como XLSX ou CSV e devolve linhas brutas por cabeçalho normalizado. */
export async function parseFile(buffer: Buffer, filename: string): Promise<RawImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  const isCsv = filename.toLowerCase().endsWith(".csv");

  if (isCsv) {
    const stream = Readable.from(buffer);
    await workbook.csv.read(stream);
  } else {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headerMap: Record<number, string> = {};
  headerRow.eachCell((cell, colNumber) => {
    const normalized = String(cell.value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // remove acentos (ex: "código" -> "codigo")
    headerMap[colNumber] = normalized;
  });

  const rows: RawImportRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // cabeçalho

    const values: Record<string, string> = {};
    let hasAnyValue = false;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headerMap[colNumber];
      if (!header || !ALL_HEADERS.includes(header)) return;
      const raw = cell.value;
      const value = raw instanceof Date ? raw.toISOString() : String(raw ?? "").trim();
      if (value) hasAnyValue = true;
      values[header] = value;
    });

    if (hasAnyValue) rows.push({ rowNumber, values });
  });

  return rows;
}

export interface ValidationContext {
  categoryByName: Map<string, string>; // nome (lowercase) -> id
  existingBarcodes: Set<string>;
  existingSkus: Set<string>;
  seenBarcodesInFile: Set<string>;
  seenSkusInFile: Set<string>;
  defaultMargin: number;
}

function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const normalized = value.replace(",", ".").trim();
  const num = Number(normalized);
  return Number.isNaN(num) ? null : num;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value || value.trim() === "") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Valida uma linha bruta e devolve os dados já tipados (quando válida) ou a
 * lista de erros. Função pura em relação ao banco — todo o estado externo
 * (categorias existentes, códigos já usados) entra via `context`, o que
 * permite reusá-la tanto na prévia quanto na confirmação, sempre com dados
 * frescos do banco.
 */
export function validateRow(row: RawImportRow, context: ValidationContext): ValidatedImportRow {
  const errors: string[] = [];
  const v = row.values;

  for (const field of REQUIRED_HEADERS) {
    if (!v[field] || v[field].trim() === "") {
      errors.push(`Campo obrigatório ausente: ${field}.`);
    }
  }

  const unit = (v.unidade ?? "").toUpperCase();
  if (v.unidade && !VALID_UNITS.includes(unit as (typeof VALID_UNITS)[number])) {
    errors.push(`Unidade inválida: "${v.unidade}". Use uma de: ${VALID_UNITS.join(", ")}.`);
  }

  const costPrice = parseNumber(v.preco_custo);
  if (v.preco_custo && (costPrice === null || costPrice < 0)) {
    errors.push(`Preço de custo inválido: "${v.preco_custo}".`);
  }

  const salePrice = parseNumber(v.preco_venda);
  if (v.preco_venda && (salePrice === null || salePrice < 0)) {
    errors.push(`Preço de venda inválido: "${v.preco_venda}".`);
  }

  const profitMargin = parseNumber(v.margem_lucro) ?? undefined;
  if (v.margem_lucro && profitMargin === undefined) {
    errors.push(`Margem de lucro inválida: "${v.margem_lucro}".`);
  }

  const stockQuantity = v.estoque_atual ? (parseNumber(v.estoque_atual) ?? NaN) : 0;
  if (v.estoque_atual && Number.isNaN(stockQuantity)) {
    errors.push(`Estoque atual inválido: "${v.estoque_atual}".`);
  }

  const minStockQuantity = v.estoque_minimo ? (parseNumber(v.estoque_minimo) ?? NaN) : 0;
  if (v.estoque_minimo && Number.isNaN(minStockQuantity)) {
    errors.push(`Estoque mínimo inválido: "${v.estoque_minimo}".`);
  }

  let categoryId: string | undefined;
  if (v.categoria) {
    categoryId = context.categoryByName.get(v.categoria.trim().toLowerCase());
    if (!categoryId) {
      errors.push(`Categoria não encontrada: "${v.categoria}".`);
    }
  }

  const barcode = v.codigo_barras?.trim();
  if (barcode) {
    if (context.existingBarcodes.has(barcode)) {
      errors.push(`Código de barras já cadastrado no sistema: "${barcode}".`);
    } else if (context.seenBarcodesInFile.has(barcode)) {
      errors.push(`Código de barras duplicado na própria planilha: "${barcode}".`);
    }
  }

  const sku = v.sku?.trim() || undefined;
  if (sku) {
    if (context.existingSkus.has(sku)) {
      errors.push(`SKU já cadastrado no sistema: "${sku}".`);
    } else if (context.seenSkusInFile.has(sku)) {
      errors.push(`SKU duplicado na própria planilha: "${sku}".`);
    }
  }

  if (errors.length > 0) {
    return { rowNumber: row.rowNumber, data: null, errors };
  }

  // Só marca como "visto" quando a linha é válida — uma linha inválida não
  // deve fazer uma linha igual e correta mais abaixo ser rejeitada à toa.
  if (barcode) context.seenBarcodesInFile.add(barcode);
  if (sku) context.seenSkusInFile.add(sku);

  return {
    rowNumber: row.rowNumber,
    errors: [],
    data: {
      name: v.nome.trim(),
      description: v.descricao?.trim() || undefined,
      categoryName: v.categoria.trim(),
      brand: v.marca?.trim() || undefined,
      unit,
      costPrice: costPrice!,
      salePrice: salePrice!,
      profitMargin: profitMargin ?? context.defaultMargin,
      stockQuantity,
      minStockQuantity,
      expirationDate: parseDate(v.validade),
      batch: v.lote?.trim() || undefined,
      barcode,
      sku,
    },
  };
}
