import type { Request, Response } from "express";
import { AppError } from "../../shared/AppError.js";
import { commitImportSchema } from "./importExport.schema.js";
import * as importExportService from "./importExport.service.js";

export async function previewImportHandler(req: Request, res: Response) {
  if (!req.file) {
    throw new AppError("Envie um arquivo XLSX ou CSV no campo 'file'.", 422);
  }
  const result = await importExportService.previewImport(req.file.buffer, req.file.originalname);
  res.status(200).json(result);
}

export async function commitImportHandler(req: Request, res: Response) {
  const input = commitImportSchema.parse(req.body);
  const result = await importExportService.commitImport(input.rows, req.user!.id);
  res.status(200).json(result);
}

export async function exportProductsHandler(_req: Request, res: Response) {
  const buffer = await importExportService.exportProducts();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="produtos.xlsx"');
  res.send(buffer);
}

export async function importTemplateHandler(_req: Request, res: Response) {
  const buffer = await importExportService.generateImportTemplate();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="modelo-importacao-produtos.xlsx"');
  res.send(buffer);
}
