import type { Request, Response } from "express";
import { cashMovementSchema, closeCashierSchema, openCashierSchema } from "./cashier.schema.js";
import * as cashierService from "./cashier.service.js";

export async function getCurrentSessionHandler(_req: Request, res: Response) {
  const result = await cashierService.getCurrentSession();
  res.status(200).json(result ?? { session: null, totals: null });
}

export async function openCashierHandler(req: Request, res: Response) {
  const input = openCashierSchema.parse(req.body);
  const session = await cashierService.openCashier(input, req.user!.id);
  res.status(201).json({ session });
}

export async function registerCashMovementHandler(req: Request, res: Response) {
  const input = cashMovementSchema.parse(req.body);
  const movement = await cashierService.registerCashMovement(input, req.user!.id);
  res.status(201).json({ movement });
}

export async function getClosingSummaryHandler(req: Request, res: Response) {
  const result = await cashierService.getClosingSummary(req.params.id);
  res.status(200).json(result);
}

export async function closeCashierHandler(req: Request, res: Response) {
  const input = closeCashierSchema.parse(req.body);
  const result = await cashierService.closeCashier(req.params.id, input, req.user!.id);
  res.status(200).json(result);
}
