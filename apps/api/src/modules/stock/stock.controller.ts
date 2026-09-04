import type { Request, Response } from "express";
import { adjustStockSchema, listMovementsQuerySchema } from "./stock.schema.js";
import * as stockService from "./stock.service.js";

export async function adjustStockHandler(req: Request, res: Response) {
  const input = adjustStockSchema.parse(req.body);
  const result = await stockService.adjustStock(input, req.user!.id);
  res.status(201).json(result);
}

export async function listMovementsHandler(req: Request, res: Response) {
  const query = listMovementsQuerySchema.parse(req.query);
  const result = await stockService.listMovements(query);
  res.status(200).json(result);
}

export async function expirationAlertsHandler(_req: Request, res: Response) {
  const result = await stockService.getExpirationAlerts();
  res.status(200).json(result);
}
