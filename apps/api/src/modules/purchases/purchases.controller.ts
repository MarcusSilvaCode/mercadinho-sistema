import type { Request, Response } from "express";
import { createPurchaseSchema, listPurchasesQuerySchema } from "./purchases.schema.js";
import * as purchasesService from "./purchases.service.js";

export async function createPurchaseHandler(req: Request, res: Response) {
  const input = createPurchaseSchema.parse(req.body);
  const result = await purchasesService.createPurchase(input, req.user!.id);
  res.status(201).json(result);
}

export async function listPurchasesHandler(req: Request, res: Response) {
  const query = listPurchasesQuerySchema.parse(req.query);
  const result = await purchasesService.listPurchases(query);
  res.status(200).json(result);
}

export async function getPurchaseHandler(req: Request, res: Response) {
  const purchase = await purchasesService.getPurchase(req.params.id);
  res.status(200).json({ purchase });
}
