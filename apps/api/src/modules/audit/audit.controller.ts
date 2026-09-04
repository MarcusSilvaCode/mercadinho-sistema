import type { Request, Response } from "express";
import { listAuditQuerySchema } from "./audit.schema.js";
import * as auditService from "./audit.service.js";

export async function listAuditLogsHandler(req: Request, res: Response) {
  const query = listAuditQuerySchema.parse(req.query);
  const result = await auditService.listAuditLogs(query);
  res.status(200).json(result);
}
