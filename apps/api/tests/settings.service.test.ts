import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = {
  storeSettings: { findUnique: vi.fn(), upsert: vi.fn(), create: vi.fn() },
  auditLog: { create: vi.fn() },
};

const rescheduleBackupJobMock = vi.fn();

vi.mock("../src/config/prisma.js", () => ({ prisma: prismaMock }));
vi.mock("../src/modules/backup/backup.cron.js", () => ({ rescheduleBackupJob: rescheduleBackupJobMock }));

const { getSettings, updateSettings } = await import("../src/modules/settings/settings.service.js");

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.auditLog.create.mockResolvedValue({});
});

describe("settings.service — getSettings", () => {
  it("retorna as configurações existentes", async () => {
    prismaMock.storeSettings.findUnique.mockResolvedValue({ id: 1, storeName: "Meu Mercadinho" });

    const result = await getSettings();

    expect(result.storeName).toBe("Meu Mercadinho");
    expect(prismaMock.storeSettings.create).not.toHaveBeenCalled();
  });

  it("cria a linha singleton com padrões se ela não existir por algum motivo", async () => {
    prismaMock.storeSettings.findUnique.mockResolvedValue(null);
    prismaMock.storeSettings.create.mockResolvedValue({ id: 1, storeName: "Meu Mercadinho", defaultMargin: 30 });

    const result = await getSettings();

    expect(prismaMock.storeSettings.create).toHaveBeenCalled();
    expect(result.defaultMargin).toBe(30);
  });
});

describe("settings.service — updateSettings", () => {
  it("atualiza os campos informados e registra auditoria", async () => {
    prismaMock.storeSettings.upsert.mockResolvedValue({ id: 1, storeName: "Novo Nome", backupDayOfWeek: 0, backupHour: 3 });

    await updateSettings({ storeName: "Novo Nome" }, "user-1");

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "CONFIGURACAO_ALTERADA" }) }),
    );
  });

  it("reagenda o backup quando backupDayOfWeek ou backupHour mudam", async () => {
    prismaMock.storeSettings.upsert.mockResolvedValue({ id: 1, backupDayOfWeek: 3, backupHour: 5 });

    await updateSettings({ backupDayOfWeek: 3, backupHour: 5 }, "user-1");

    expect(rescheduleBackupJobMock).toHaveBeenCalledWith(3, 5);
  });

  it("não reagenda o backup quando nem dia nem hora mudam", async () => {
    prismaMock.storeSettings.upsert.mockResolvedValue({ id: 1, storeName: "Outro nome" });

    await updateSettings({ storeName: "Outro nome" }, "user-1");

    expect(rescheduleBackupJobMock).not.toHaveBeenCalled();
  });
});
