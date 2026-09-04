import { prisma } from "../config/prisma.js";
import type { AuditAction, Prisma } from "@prisma/client";

interface LogAuditParams {
  userId?: string | null;
  action: AuditAction;
  entity?: string;
  entityId?: string;
  details?: Prisma.InputJsonValue;
}

/**
 * Registra um evento de auditoria. Nunca deve derrubar a requisição principal
 * caso falhe — por isso captura o próprio erro internamente.
 */
export async function logAudit({ userId, action, entity, entityId, details }: LogAuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        entity,
        entityId,
        details,
      },
    });
  } catch (err) {
    console.error("Falha ao registrar auditoria:", err);
  }
}
