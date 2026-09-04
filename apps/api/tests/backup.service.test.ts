import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const prismaMock = {
  backupLog: { create: vi.fn(), findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
};

vi.mock("../src/config/prisma.js", () => ({ prisma: prismaMock }));

const { runBackup, listBackups, getLastBackup } = await import("../src/modules/backup/backup.service.js");

let originalCwd: string;
let tempDir: string;

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.backupLog.create.mockResolvedValue({});
  prismaMock.auditLog.create.mockResolvedValue({});

  // Roda cada teste num diretório temporário, para o backup local de
  // verdade (mkdir + writeFile) não sujar o repositório nem depender de
  // limpeza manual entre execuções.
  originalCwd = process.cwd();
  tempDir = mkdtempSync(path.join(tmpdir(), "mercadinho-backup-test-"));
  process.chdir(tempDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(tempDir, { recursive: true, force: true });
});

describe("backup.service — runBackup (sucesso)", () => {
  it("grava um BackupLog de SUCESSO com nome de arquivo e tamanho", async () => {
    const fakeDump = vi.fn().mockResolvedValue(Buffer.from("dump falso de teste"));

    const result = await runBackup(null, fakeDump);

    expect(result.status).toBe("SUCESSO");
    expect(prismaMock.backupLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUCESSO", fileName: expect.stringMatching(/^backup-.*\.dump$/) }),
      }),
    );
  });

  it("não registra auditoria quando a execução é automática (userId nulo)", async () => {
    const fakeDump = vi.fn().mockResolvedValue(Buffer.from("dump"));

    await runBackup(null, fakeDump);

    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  it("registra auditoria com manual=true quando um usuário dispara o backup", async () => {
    const fakeDump = vi.fn().mockResolvedValue(Buffer.from("dump"));

    await runBackup("user-1", fakeDump);

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "BACKUP_EXECUTADO",
          details: expect.objectContaining({ manual: true, sucesso: true }),
        }),
      }),
    );
  });
});

describe("backup.service — runBackup (falha)", () => {
  it("grava um BackupLog de FALHA com a mensagem de erro quando o dump falha", async () => {
    const fakeDump = vi.fn().mockRejectedValue(new Error("pg_dump não encontrado"));

    const result = await runBackup(null, fakeDump);

    expect(result.status).toBe("FALHA");
    expect(prismaMock.backupLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FALHA", errorMessage: "pg_dump não encontrado" }),
      }),
    );
  });

  it("registra auditoria com sucesso=false quando falha manualmente", async () => {
    const fakeDump = vi.fn().mockRejectedValue(new Error("Falha simulada"));

    await runBackup("user-1", fakeDump);

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ details: expect.objectContaining({ sucesso: false }) }),
      }),
    );
  });
});

describe("backup.service — listBackups / getLastBackup", () => {
  it("pagina o histórico corretamente", async () => {
    prismaMock.backupLog.findMany.mockResolvedValue([{ id: "1" }]);
    prismaMock.backupLog.count.mockResolvedValue(50);

    const result = await listBackups(2, 10);

    expect(prismaMock.backupLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10, orderBy: { createdAt: "desc" } }),
    );
    expect(result.total).toBe(50);
  });

  it("busca o backup mais recente ordenando por data decrescente", async () => {
    prismaMock.backupLog.findFirst.mockResolvedValue({ id: "1", status: "SUCESSO" });

    const result = await getLastBackup();

    expect(prismaMock.backupLog.findFirst).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" } });
    expect(result?.status).toBe("SUCESSO");
  });
});
