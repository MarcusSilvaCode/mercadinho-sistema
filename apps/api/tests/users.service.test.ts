import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = {
  user: { findUnique: vi.fn(), update: vi.fn() },
  auditLog: { create: vi.fn() },
};

vi.mock("../src/config/prisma.js", () => ({ prisma: prismaMock }));

const { updateUser, resetPassword } = await import("../src/modules/users/users.service.js");
const { changePasswordSchema } = await import("../src/modules/auth/auth.schema.js");

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.auditLog.create.mockResolvedValue({});
  prismaMock.user.update.mockImplementation(({ data }: { data: object }) =>
    Promise.resolve({ id: "user-2", fullName: "Operador", username: "op", active: true, ...data }),
  );
});

describe("users.service — updateUser", () => {
  it("impede que o usuário desative a si mesmo (evita ficar trancado para fora)", async () => {
    await expect(updateUser("user-1", { active: false }, "user-1")).rejects.toThrow(
      "Você não pode desativar o seu próprio usuário.",
    );
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("permite desativar outro usuário", async () => {
    const user = await updateUser("user-2", { active: false }, "user-1");
    expect(user.active).toBe(false);
  });

  it("permite alterar o próprio nome", async () => {
    await updateUser("user-1", { fullName: "Novo Nome" }, "user-1");
    expect(prismaMock.user.update).toHaveBeenCalled();
  });
});

describe("users.service — resetPassword", () => {
  it("não deixa redefinir a própria senha por esta rota (exige a senha atual na troca)", async () => {
    await expect(
      resetPassword("user-1", "user-1", { newPassword: "123456", confirmPassword: "123456" }),
    ).rejects.toThrow();
  });
});

describe("auth.schema — changePasswordSchema", () => {
  it("rejeita confirmação diferente", () => {
    const r = changePasswordSchema.safeParse({ currentPassword: "a", newPassword: "123456", confirmPassword: "654321" });
    expect(r.success).toBe(false);
  });

  it("rejeita nova senha igual à atual", () => {
    const r = changePasswordSchema.safeParse({ currentPassword: "123456", newPassword: "123456", confirmPassword: "123456" });
    expect(r.success).toBe(false);
  });

  it("rejeita nova senha curta", () => {
    const r = changePasswordSchema.safeParse({ currentPassword: "a", newPassword: "123", confirmPassword: "123" });
    expect(r.success).toBe(false);
  });
});
