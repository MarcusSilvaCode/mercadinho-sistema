import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { errorHandler } from "../src/middlewares/errorHandler.js";
import { AppError } from "../src/shared/AppError.js";

function mockResponse() {
  const res: { statusCode?: number; body?: unknown; status: (c: number) => typeof res; json: (b: unknown) => typeof res } = {
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
  };
  return res;
}

describe("errorHandler — nunca vaza detalhes internos", () => {
  it("AppError retorna o status e a mensagem definidos explicitamente", () => {
    const res = mockResponse();
    errorHandler(new AppError("Produto não encontrado.", 404), {} as never, res as never, vi.fn());

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Produto não encontrado." });
  });

  it("ZodError vira 422 com a lista de problemas, nunca o objeto de erro bruto do Zod", () => {
    const schema = z.object({ name: z.string().min(2) });
    const parseResult = schema.safeParse({ name: "a" });
    const res = mockResponse();

    if (!parseResult.success) {
      errorHandler(parseResult.error, {} as never, res as never, vi.fn());
    }

    expect(res.statusCode).toBe(422);
    expect((res.body as { issues: unknown[] }).issues.length).toBeGreaterThan(0);
    expect((res.body as { error: string }).error).toBe("Dados inválidos.");
  });

  it("um erro genérico (bug não tratado) vira 500 com mensagem GENÉRICA, sem stack trace nem detalhes internos", () => {
    const res = mockResponse();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const internalError = new Error("Conexão recusada em postgresql://user:senha@host:5432/db");
    errorHandler(internalError, {} as never, res as never, vi.fn());

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Erro interno do servidor." });
    // A mensagem original (que poderia vazar a connection string) nunca
    // deve aparecer no corpo da resposta enviada ao cliente.
    expect(JSON.stringify(res.body)).not.toContain("postgresql://");
    expect(JSON.stringify(res.body)).not.toContain("senha");

    consoleSpy.mockRestore();
  });

  it("erro genérico ainda é logado no servidor (para diagnóstico), só não é exposto ao cliente", () => {
    const res = mockResponse();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    errorHandler(new Error("Detalhe sensível de diagnóstico"), {} as never, res as never, vi.fn());

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("strings ou valores não-Error lançados também caem no 500 genérico, sem quebrar o handler", () => {
    const res = mockResponse();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => errorHandler("algo deu errado", {} as never, res as never, vi.fn())).not.toThrow();
    expect(res.statusCode).toBe(500);

    consoleSpy.mockRestore();
  });
});

describe("errorHandler — status customizado é respeitado", () => {
  it("AppError com status customizado (ex: 409 de conflito) é respeitado", () => {
    const res = mockResponse();
    errorHandler(new AppError("Já existe um caixa aberto.", 409), {} as never, res as never, vi.fn());

    expect(res.statusCode).toBe(409);
  });
});
