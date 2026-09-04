import type { Request, Response } from "express";
import { z } from "zod";
import * as backupService from "./backup.service.js";

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export async function listBackupsHandler(req: Request, res: Response) {
  const { page, pageSize } = listQuerySchema.parse(req.query);
  const result = await backupService.listBackups(page, pageSize);
  res.status(200).json(result);
}

export async function runBackupHandler(req: Request, res: Response) {
  const result = await backupService.runBackup(req.user!.id);
  const statusCode = result.status === "SUCESSO" ? 201 : 500;
  res.status(statusCode).json(result);
}

export async function getLastBackupHandler(_req: Request, res: Response) {
  const backup = await backupService.getLastBackup();
  res.status(200).json({ backup });
}
