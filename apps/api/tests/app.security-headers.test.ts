import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

// Mock abrangente o suficiente para todos os módulos carregarem sem erro
// ao montar o app inteiro (rotas de todos os módulos são importadas por
// app.ts) — sem isso, o `new PrismaClient()` real quebraria a importação,
// como vimos acontecer ao tentar subir o servidor de verdade neste sandbox.
vi.mock("../src/config/prisma.js", () => ({
  prisma: new Proxy(
    {},
    { get: () => new Proxy(() => Promise.resolve(null), { get: () => vi.fn(async () => null) }) },
  ),
}));

const { createApp } = await import("../src/app.js");

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(() => {
  server.close();
});

describe("app — cabeçalhos de segurança (Helmet) numa resposta HTTP real", () => {
  it("aplica os cabeçalhos padrão do Helmet em qualquer resposta", async () => {
    const res = await fetch(`${baseUrl}/health`);

    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(res.headers.get("x-dns-prefetch-control")).toBe("off");
  });

  it("nunca expõe o cabeçalho X-Powered-By (que revela a stack Express)", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.headers.get("x-powered-by")).toBeNull();
  });

  it("o rate limiter geral expõe os cabeçalhos padrão de limite (RateLimit-*)", async () => {
    const res = await fetch(`${baseUrl}/health`);
    // A rota /health está fora de /api, então não deveria ter esses
    // cabeçalhos — confirmando que o limiter está escopado corretamente.
    expect(res.headers.get("ratelimit-limit")).toBeNull();
  });

  it("uma rota sob /api recebe os cabeçalhos do rate limiter geral", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    expect(res.headers.get("ratelimit-limit")).not.toBeNull();
  });

  it("rota inexistente retorna 404 com mensagem padronizada (nunca stack trace HTML do Express)", async () => {
    const res = await fetch(`${baseUrl}/api/rota-que-nao-existe`);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: "Rota não encontrada." });
  });
});
