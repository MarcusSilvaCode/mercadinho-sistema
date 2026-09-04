import { describe, it, expect, beforeEach } from "vitest";
import { validateRow, type RawImportRow, type ValidationContext } from "../src/modules/importExport/importExport.parser.js";

function makeContext(overrides: Partial<ValidationContext> = {}): ValidationContext {
  return {
    categoryByName: new Map([["mercearia", "cat-1"]]),
    existingBarcodes: new Set(),
    existingSkus: new Set(),
    seenBarcodesInFile: new Set(),
    seenSkusInFile: new Set(),
    defaultMargin: 30,
    ...overrides,
  };
}

function row(rowNumber: number, values: Record<string, string>): RawImportRow {
  return { rowNumber, values };
}

describe("importExport.parser — validateRow", () => {
  let context: ValidationContext;

  beforeEach(() => {
    context = makeContext();
  });

  it("aceita uma linha válida completa", () => {
    const result = validateRow(
      row(2, {
        nome: "Arroz 5kg",
        categoria: "Mercearia",
        unidade: "UN",
        preco_custo: "20",
        preco_venda: "25",
        codigo_barras: "7891000000001",
      }),
      context,
    );

    expect(result.errors).toEqual([]);
    expect(result.data?.name).toBe("Arroz 5kg");
    expect(result.data?.costPrice).toBe(20);
  });

  it("rejeita quando falta um campo obrigatório", () => {
    const result = validateRow(
      row(2, { categoria: "Mercearia", unidade: "UN", preco_custo: "20", preco_venda: "25", codigo_barras: "123" }),
      context,
    );

    expect(result.errors.some((e) => e.includes("nome"))).toBe(true);
  });

  it("rejeita categoria inexistente", () => {
    const result = validateRow(
      row(2, {
        nome: "Produto X",
        categoria: "Categoria Fantasma",
        unidade: "UN",
        preco_custo: "10",
        preco_venda: "15",
        codigo_barras: "111",
      }),
      context,
    );

    expect(result.errors.some((e) => e.includes("Categoria não encontrada"))).toBe(true);
  });

  it("busca categoria de forma case-insensitive", () => {
    const result = validateRow(
      row(2, {
        nome: "Produto X",
        categoria: "MERCEARIA",
        unidade: "UN",
        preco_custo: "10",
        preco_venda: "15",
        codigo_barras: "111",
      }),
      context,
    );

    expect(result.errors).toEqual([]);
  });

  it("rejeita unidade inválida", () => {
    const result = validateRow(
      row(2, {
        nome: "Produto X",
        categoria: "Mercearia",
        unidade: "TONELADA",
        preco_custo: "10",
        preco_venda: "15",
        codigo_barras: "111",
      }),
      context,
    );

    expect(result.errors.some((e) => e.includes("Unidade inválida"))).toBe(true);
  });

  it("rejeita preço de custo não numérico", () => {
    const result = validateRow(
      row(2, {
        nome: "Produto X",
        categoria: "Mercearia",
        unidade: "UN",
        preco_custo: "abc",
        preco_venda: "15",
        codigo_barras: "111",
      }),
      context,
    );

    expect(result.errors.some((e) => e.includes("Preço de custo inválido"))).toBe(true);
  });

  it("aceita vírgula como separador decimal", () => {
    const result = validateRow(
      row(2, {
        nome: "Produto X",
        categoria: "Mercearia",
        unidade: "UN",
        preco_custo: "10,50",
        preco_venda: "15,90",
        codigo_barras: "111",
      }),
      context,
    );

    expect(result.data?.costPrice).toBe(10.5);
    expect(result.data?.salePrice).toBe(15.9);
  });

  it("rejeita código de barras já cadastrado no sistema", () => {
    context = makeContext({ existingBarcodes: new Set(["7891000000001"]) });

    const result = validateRow(
      row(2, {
        nome: "Produto X",
        categoria: "Mercearia",
        unidade: "UN",
        preco_custo: "10",
        preco_venda: "15",
        codigo_barras: "7891000000001",
      }),
      context,
    );

    expect(result.errors.some((e) => e.includes("já cadastrado no sistema"))).toBe(true);
  });

  it("rejeita código de barras duplicado dentro da própria planilha", () => {
    const linha1 = row(2, {
      nome: "Produto A",
      categoria: "Mercearia",
      unidade: "UN",
      preco_custo: "10",
      preco_venda: "15",
      codigo_barras: "111",
    });
    const linha2 = row(3, {
      nome: "Produto B",
      categoria: "Mercearia",
      unidade: "UN",
      preco_custo: "20",
      preco_venda: "25",
      codigo_barras: "111",
    });

    const r1 = validateRow(linha1, context);
    const r2 = validateRow(linha2, context);

    expect(r1.errors).toEqual([]); // primeira ocorrência é válida
    expect(r2.errors.some((e) => e.includes("duplicado na própria planilha"))).toBe(true);
  });

  it("herda a margem padrão da loja quando não informada", () => {
    const result = validateRow(
      row(2, {
        nome: "Produto X",
        categoria: "Mercearia",
        unidade: "UN",
        preco_custo: "10",
        preco_venda: "15",
        codigo_barras: "111",
      }),
      context,
    );

    expect(result.data?.profitMargin).toBe(30);
  });

  it("respeita a margem informada na planilha", () => {
    const result = validateRow(
      row(2, {
        nome: "Produto X",
        categoria: "Mercearia",
        unidade: "UN",
        preco_custo: "10",
        preco_venda: "15",
        codigo_barras: "111",
        margem_lucro: "45",
      }),
      context,
    );

    expect(result.data?.profitMargin).toBe(45);
  });

  it("estoque atual e mínimo assumem zero quando ausentes", () => {
    const result = validateRow(
      row(2, {
        nome: "Produto X",
        categoria: "Mercearia",
        unidade: "UN",
        preco_custo: "10",
        preco_venda: "15",
        codigo_barras: "111",
      }),
      context,
    );

    expect(result.data?.stockQuantity).toBe(0);
    expect(result.data?.minStockQuantity).toBe(0);
  });

  it("acumula todos os erros de uma linha, não só o primeiro", () => {
    const result = validateRow(
      row(2, {
        nome: "",
        categoria: "Fantasma",
        unidade: "TONELADA",
        preco_custo: "abc",
        preco_venda: "15",
        codigo_barras: "111",
      }),
      context,
    );

    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });
});
