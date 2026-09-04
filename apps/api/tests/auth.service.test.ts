import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";

// --- Mock do Prisma: nenhuma conexão real com banco é necessária ---
const prismaMock = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

vi.mock("../src/config/prisma.js", () => ({ prisma: prismaMock }));

// Import depois do mock, para que auth.service.ts use o prisma mockado
const { login, verifyPassword } = await import("../src/modules/auth/auth.service.js");
const { AppError } = await import("../src/shared/AppError.js");

const ACTIVE_USER = {
  id: "user-1",
  fullName: "Administrador 1",
  username: "admin1",
  active: true,
  passwordHash: "",
};

beforeEach(async () => {
  vi.clearAllMocks();
  ACTIVE_USER.passwordHash = await bcrypt.hash("admin123", 10);
  prismaMock.user.update.mockResolvedValue(ACTIVE_USER);
  prismaMock.auditLog.create.mockResolvedValue({});
});

describe("auth.service — login", () => {
  it("autentica com credenciais corretas e retorna um token", async () => {
    prismaMock.user.findUnique.mockResolvedValue(ACTIVE_USER);

    const result = await login({ username: "admin1", password: "admin123" });

    expect(result.token).toBeTypeOf("string");
    expect(result.user.username).toBe("admin1");
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "LOGIN" }) }),
    );
  });

  it("rejeita senha incorreta com mensagem genérica", async () => {
    prismaMock.user.findUnique.mockResolvedValue(ACTIVE_USER);

    await expect(login({ username: "admin1", password: "senha-errada" })).rejects.toThrow(AppError);
    await expect(login({ username: "admin1", password: "senha-errada" })).rejects.toThrow(
      "Usuário ou senha inválidos.",
    );
  });

  it("rejeita usuário inexistente com a MESMA mensagem genérica (não revela se o usuário existe)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(login({ username: "fantasma", password: "qualquer" })).rejects.toThrow(
      "Usuário ou senha inválidos.",
    );
  });

  it("rejeita usuário inativo mesmo com senha correta", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, active: false });

    await expect(login({ username: "admin1", password: "admin123" })).rejects.toThrow(
      "Usuário ou senha inválidos.",
    );
  });

  it("registra auditoria de LOGIN_FALHOU em senha incorreta", async () => {
    prismaMock.user.findUnique.mockResolvedValue(ACTIVE_USER);

    await expect(login({ username: "admin1", password: "errada" })).rejects.toThrow();

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "LOGIN_FALHOU" }) }),
    );
  });
});

describe("auth.service — verifyPassword (desbloqueio de tela)", () => {
  it("confirma senha correta do usuário logado sem exigir novo login", async () => {
    prismaMock.user.findUnique.mockResolvedValue(ACTIVE_USER);

    await expect(verifyPassword(ACTIVE_USER.id, "admin123")).resolves.toBe(true);
  });

  it("rejeita senha incorreta no desbloqueio", async () => {
    prismaMock.user.findUnique.mockResolvedValue(ACTIVE_USER);

    await expect(verifyPassword(ACTIVE_USER.id, "errada")).rejects.toThrow("Senha incorreta.");
  });
});
