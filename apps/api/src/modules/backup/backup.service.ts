import { spawn } from "node:child_process";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { logAudit } from "../../shared/audit.js";
import { saveBackupFile } from "./backupStorage.js";

/**
 * Roda `pg_dump` contra o banco configurado e devolve o dump em memória.
 * Dispara um processo externo — por isso nunca é chamada diretamente nos
 * testes (veja `runBackup`, que recebe esta função por injeção).
 */
export function createDatabaseDump(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn("pg_dump", [env.DATABASE_URL, "-F", "c"]);
    const chunks: Buffer[] = [];
    let stderr = "";

    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));

    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`pg_dump saiu com código ${code}: ${stderr || "erro desconhecido"}`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });
  });
}

function buildFileName(): string {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  return `backup-${stamp}.dump`;
}

/**
 * Executa um backup e registra o resultado (sucesso ou falha) no
 * histórico. `dumpFn` é injetável — em produção é `createDatabaseDump`;
 * nos testes, uma função falsa que não depende de um Postgres real.
 * `userId` nulo indica execução automática (via cron), não manual.
 */
export async function runBackup(userId: string | null, dumpFn: () => Promise<Buffer> = createDatabaseDump) {
  const fileName = buildFileName();

  try {
    const buffer = await dumpFn();
    const { sizeBytes } = await saveBackupFile(buffer, fileName);

    await prisma.backupLog.create({
      data: { status: "SUCESSO", fileName, sizeBytes },
    });

    if (userId) {
      await logAudit({
        userId,
        action: "BACKUP_EXECUTADO",
        details: { fileName, sizeBytes, manual: true, sucesso: true },
      });
    }

    return { status: "SUCESSO" as const, fileName, sizeBytes };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Erro desconhecido ao gerar o backup.";

    await prisma.backupLog.create({
      data: { status: "FALHA", errorMessage },
    });

    if (userId) {
      await logAudit({
        userId,
        action: "BACKUP_EXECUTADO",
        details: { manual: true, sucesso: false, errorMessage },
      });
    }

    return { status: "FALHA" as const, errorMessage };
  }
}

export async function listBackups(page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.backupLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.backupLog.count(),
  ]);

  return { items, total, page, pageSize };
}

export async function getLastBackup() {
  return prisma.backupLog.findFirst({ orderBy: { createdAt: "desc" } });
}
