import { describe, it, expect, vi } from "vitest";
import { lookupBarcodeInfo } from "../src/modules/products/barcodeLookup.service.js";

function fakeFetch(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) }) as unknown as typeof fetch;
}

describe("barcodeLookup.service — lookupBarcodeInfo", () => {
  it("retorna nome (com quantidade) e a primeira marca quando o produto existe", async () => {
    const fetchImpl = fakeFetch({
      status: 1,
      product: { product_name_pt: "Arroz Branco", brands: "Tio João, Josapar", quantity: "5 kg" },
    });

    const result = await lookupBarcodeInfo("7893500018469", fetchImpl);

    expect(result).toEqual({ found: true, name: "Tio João Arroz Branco 5 kg", brand: "Tio João" });
  });

  it("não repete a marca quando ela já está no nome", async () => {
    const fetchImpl = fakeFetch({ status: 1, product: { product_name: "Refrigerante Coca-Cola 2L", brands: "Coca-Cola" } });

    const result = await lookupBarcodeInfo("7894900011517", fetchImpl);

    expect(result.name).toBe("Refrigerante Coca-Cola 2L");
  });

  it("não repete a quantidade quando ela já está no nome", async () => {
    const fetchImpl = fakeFetch({ status: 1, product: { product_name: "Leite Integral 1L", quantity: "1L" } });

    const result = await lookupBarcodeInfo("7891000100103", fetchImpl);

    expect(result).toEqual({ found: true, name: "Leite Integral 1L", brand: undefined });
  });

  it("prefere o nome em português ao nome genérico", async () => {
    const fetchImpl = fakeFetch({ status: 1, product: { product_name_pt: "Biscoito", product_name: "Cookie" } });

    const result = await lookupBarcodeInfo("7891000100103", fetchImpl);

    expect(result.name).toBe("Biscoito");
  });

  it("retorna found=false quando o produto não existe na base", async () => {
    const result = await lookupBarcodeInfo("7891000100103", fakeFetch({ status: 0 }));
    expect(result).toEqual({ found: false });
  });

  it("retorna found=false quando o serviço externo responde com erro", async () => {
    const result = await lookupBarcodeInfo("7891000100103", fakeFetch({}, false));
    expect(result).toEqual({ found: false });
  });

  it("retorna found=false (sem lançar) quando a requisição falha ou estoura o tempo", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("timeout")) as unknown as typeof fetch;
    const result = await lookupBarcodeInfo("7891000100103", fetchImpl);
    expect(result).toEqual({ found: false });
  });

  it("não chama o serviço externo para códigos inválidos (letras, barras, tamanho errado)", async () => {
    const fetchImpl = fakeFetch({ status: 1, product: { product_name: "X" } });

    for (const code of ["abc12345", "../../etc", "1234567", "123456789012345", "SKU-0001"]) {
      expect(await lookupBarcodeInfo(code, fetchImpl)).toEqual({ found: false });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
