import cron, { type ScheduledTask } from "node-cron";
import { prisma } from "../../config/prisma.js";
import { runBackup } from "./backup.service.js";

let scheduledTask: ScheduledTask | null = null;

/**
 * (Re)agenda o job de backup automático. Sempre para o job anterior antes
 * de criar um novo — nunca dois jobs concorrentes rodando com
 * configurações diferentes de dia/hora.
 */
export function rescheduleBackupJob(dayOfWeek: number, hour: number): void {
  if (scheduledTask) {
    scheduledTask.stop();
  }

  // Formato node-cron: minuto hora dia-do-mês mês dia-da-semana (0-6, domingo=0)
  const cronExpression = `0 ${hour} * * ${dayOfWeek}`;

  scheduledTask = cron.schedule(cronExpression, () => {
    runBackup(null).catch((err) => {
      console.error("Falha ao executar o backup automático:", err);
    });
  });
}

/** Lê a configuração salva e agenda o job — chamado uma vez na subida do servidor. */
export async function initBackupSchedule(): Promise<void> {
  const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
  rescheduleBackupJob(settings?.backupDayOfWeek ?? 0, settings?.backupHour ?? 3);
}
