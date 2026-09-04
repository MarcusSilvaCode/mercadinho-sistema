import { describe, it, expect } from "vitest";
import { suggestSalePrice, calculateMargin } from "../src/shared/pricing.js";

describe("pricing — suggestSalePrice", () => {
  it("calcula o preço sugerido a partir do custo e da margem (exemplo da especificação)", () => {
    // Custo R$ 6,00, margem 40% -> preço sugerido R$ 8,40
    expect(suggestSalePrice(6, 40)).toBe(8.4);
  });

  it("arredonda para 2 casas decimais", () => {
    expect(suggestSalePrice(5.99, 33.33)).toBe(7.99);
  });

  it("com margem 0%, sugere o próprio custo", () => {
    expect(suggestSalePrice(10, 0)).toBe(10);
  });
});

describe("pricing — calculateMargin", () => {
  it("calcula a margem percentual a partir de custo e venda", () => {
    expect(calculateMargin(5, 6.5)).toBe(30);
  });

  it("retorna 0 quando o custo é zero (evita divisão por zero)", () => {
    expect(calculateMargin(0, 10)).toBe(0);
  });
});
