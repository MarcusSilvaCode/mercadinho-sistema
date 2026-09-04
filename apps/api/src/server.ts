import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { initBackupSchedule } from "./modules/backup/backup.cron.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`API rodando em http://localhost:${env.PORT}`);
});

initBackupSchedule().catch((err) => {
  console.error("Falha ao iniciar o agendamento de backup:", err);
});
