import { prisma } from "../../config/prisma.js";
import { logAudit } from "../../shared/audit.js";
import { rescheduleBackupJob } from "../backup/backup.cron.js";
import type { UpdateSettingsInput } from "./settings.schema.js";

export async function getSettings() {
  const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
  if (settings) return settings;

  // Salvaguarda: se por algum motivo o seed nunca rodou, cria a linha
  // singleton com valores padrão em vez de quebrar a tela de configurações.
  return prisma.storeSettings.create({
    data: { id: 1, storeName: "Meu Mercadinho", defaultMargin: 30, maxDiscountPercent: 30 },
  });
}

export async function updateSettings(input: UpdateSettingsInput, userId: string) {
  const updated = await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: input,
    create: { id: 1, storeName: input.storeName ?? "Meu Mercadinho", ...input },
  });

  await logAudit({
    userId,
    action: "CONFIGURACAO_ALTERADA",
    entity: "StoreSettings",
    entityId: "1",
    details: input,
  });

  // Dia/hora do backup mudaram? Reagenda o job na hora — nunca dois jobs
  // concorrentes rodando com configurações diferentes.
  if (input.backupDayOfWeek !== undefined || input.backupHour !== undefined) {
    rescheduleBackupJob(updated.backupDayOfWeek, updated.backupHour);
  }

  return updated;
}
