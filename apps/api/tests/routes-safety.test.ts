import { describe, it, expect, vi } from "vitest";

// Mock mínimo do Prisma só para permitir a importação dos módulos de rota
// sem quebrar por falta do client gerado (mesma limitação documentada
// desde a Fase 3) — este teste não faz nenhuma query, só inspeciona quais
// métodos HTTP cada roteador registra.
vi.mock("../src/config/prisma.js", () => ({
  prisma: new Proxy({}, { get: () => new Proxy({}, { get: () => vi.fn() }) }),
}));

const { categoriesRouter } = await import("../src/modules/categories/categories.routes.js");
const { productsRouter } = await import("../src/modules/products/products.routes.js");
const { salesRouter } = await import("../src/modules/sales/sales.routes.js");

interface ExpressLayer {
  route?: { methods: Record<string, boolean> };
}

function registeredMethods(router: { stack: ExpressLayer[] }): string[] {
  return router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => Object.keys(layer.route!.methods));
}

describe("Segurança de integridade — nenhuma exclusão física de entidades com histórico", () => {
  it("o roteador de categorias não expõe nenhuma rota DELETE (só inativação via PATCH)", () => {
    expect(registeredMethods(categoriesRouter)).not.toContain("delete");
  });

  it("o roteador de produtos não expõe nenhuma rota DELETE (só inativação via PATCH)", () => {
    expect(registeredMethods(productsRouter)).not.toContain("delete");
  });

  it("o roteador de vendas não expõe nenhuma rota DELETE (só cancelamento/devolução)", () => {
    expect(registeredMethods(salesRouter)).not.toContain("delete");
  });
});
