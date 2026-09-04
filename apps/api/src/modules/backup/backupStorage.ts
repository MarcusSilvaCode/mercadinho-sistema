import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface BackupStorageResult {
  fileName: string;
  sizeBytes: number;
}

const LOCAL_BACKUP_DIR = path.resolve(process.cwd(), "backups");

/**
 * Salva o arquivo de backup. Hoje grava localmente em `backups/`.
 *
 * Ponto de extensão para nuvem: quando o provedor (S3/GCS/etc.) for
 * escolhido no deploy — decisão que a Fase 1 explicitamente deixou para
 * este momento —, troque o corpo desta função por um upload real usando
 * as variáveis BACKUP_STORAGE_* já reservadas no .env.example desde a
 * Fase 2. A assinatura (buffer + nome -> {fileName, sizeBytes}) não muda,
 * então nenhum código que chama esta função precisa saber a diferença.
 */
export async function saveBackupFile(buffer: Buffer, fileName: string): Promise<BackupStorageResult> {
  await mkdir(LOCAL_BACKUP_DIR, { recursive: true });
  const filePath = path.join(LOCAL_BACKUP_DIR, fileName);
  await writeFile(filePath, buffer);

  return { fileName, sizeBytes: buffer.length };
}
