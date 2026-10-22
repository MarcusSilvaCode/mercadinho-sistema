import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { logAudit } from "../../shared/audit.js";
import type { CreateUserInput, ResetPasswordInput, UpdateUserInput } from "./users.schema.js";

const SAFE_SELECT = {
  id: true,
  fullName: true,
  username: true,
  active: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

export async function listUsers() {
  return prisma.user.findMany({ select: SAFE_SELECT, orderBy: { fullName: "asc" } });
}

export async function createUser(input: CreateUserInput, actingUserId: string) {
  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      username: input.username,
      passwordHash,
    },
    select: SAFE_SELECT,
  });

  await logAudit({
    userId: actingUserId,
    action: "CONFIGURACAO_ALTERADA",
    entity: "User",
    entityId: user.id,
    details: { operacao: "criacao_usuario", username: user.username },
  });

  return user;
}

export async function updateUser(targetId: string, input: UpdateUserInput, actingUserId: string) {
  if (input.active === false && targetId === actingUserId) {
    throw new AppError("Você não pode desativar o seu próprio usuário.", 400);
  }

  const user = await prisma.user.update({
    where: { id: targetId },
    data: input,
    select: SAFE_SELECT,
  });

  await logAudit({
    userId: actingUserId,
    action: "CONFIGURACAO_ALTERADA",
    entity: "User",
    entityId: user.id,
    details: { operacao: "atualizacao_usuario", alteracoes: input },
  });

  return user;
}

export async function resetPassword(
  targetId: string,
  actingUserId: string,
  { newPassword }: ResetPasswordInput,
) {
  if (targetId === actingUserId) {
    throw new AppError("Use a tela de perfil para alterar sua própria senha.", 400);
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    throw new AppError("Usuário não encontrado.", 404);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: targetId },
    data: { passwordHash },
  });

  await logAudit({
    userId: actingUserId,
    action: "SENHA_REDEFINIDA",
    entity: "User",
    entityId: targetId,
    details: { redefinidoPor: actingUserId },
  });
}
