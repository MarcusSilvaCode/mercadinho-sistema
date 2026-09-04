import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/AppError.js";
import { logAudit } from "../../shared/audit.js";
import type { LoginInput } from "./auth.schema.js";

const GENERIC_INVALID_CREDENTIALS = "Usuário ou senha inválidos.";

export function signToken(payload: { id: string; username: string; fullName: string }) {
  const options: jwt.SignOptions = { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export async function login({ username, password }: LoginInput) {
  const user = await prisma.user.findUnique({ where: { username } });

  // Mensagem genérica sempre igual, para não revelar se o usuário existe ou não
  if (!user || !user.active) {
    if (user && !user.active) {
      await logAudit({
        userId: user.id,
        action: "LOGIN_FALHOU",
        entity: "User",
        entityId: user.id,
        details: { motivo: "usuario_inativo" },
      });
    }
    throw new AppError(GENERIC_INVALID_CREDENTIALS, 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    await logAudit({
      userId: user.id,
      action: "LOGIN_FALHOU",
      entity: "User",
      entityId: user.id,
      details: { motivo: "senha_incorreta" },
    });
    throw new AppError(GENERIC_INVALID_CREDENTIALS, 401);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await logAudit({
    userId: user.id,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
  });

  const token = signToken({ id: user.id, username: user.username, fullName: user.fullName });

  return {
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
    },
  };
}

export async function logout(userId: string) {
  await logAudit({ userId, action: "LOGOUT", entity: "User", entityId: userId });
}

/**
 * Usado pelo modal de desbloqueio de tela: reautentica o usuário já logado
 * sem exigir novo login nem interromper venda/caixa em andamento.
 */
export async function verifyPassword(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.active) {
    throw new AppError("Usuário inválido.", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Senha incorreta.", 401);
  }

  return true;
}
