import { describe, it, expect, vi } from "vitest";
import type { AddressInfo } from "node:net";

let databaseUp = true;

vi.mock("../src/config/prisma.js", () => ({
  prisma: new Proxy(
    {
      $queryRaw: async () => {
        if (!databaseUp) throw new Error("password authentication failed for user neondb_owner");
        return [{ ok: 1 }];
      },
    },
    {
      get: (target, prop) =>
        prop in target ? target[prop as keyof typeof target] : new Proxy({}, { get: () => vi.fn(async () => null) }),
    },
  ),
}));

const { createApp } = await import("../src/app.js");

async function getHealth() {
  const server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  const { port } = server.address() as AddressInfo;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

describe("GET /api/health", () => {
  it("responde ok quando o banco responde", async () => {
    databaseUp = true;
    expect(await getHealth()).toEqual({ status: 200, body: { status: "ok", banco: "ok" } });
  });

  it("responde 503 'banco fora' quando o banco não responde, sem vazar detalhes do erro", async () => {
    databaseUp = false;
    expect(await getHealth()).toEqual({ status: 503, body: { status: "erro", banco: "fora" } });
  });
});
