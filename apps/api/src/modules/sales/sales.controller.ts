import type { Request, Response } from "express";
import { cancelSaleSchema, createSaleSchema, listSalesQuerySchema, returnSaleSchema } from "./sales.schema.js";
import * as salesService from "./sales.service.js";

export async function createSaleHandler(req: Request, res: Response) {
  const input = createSaleSchema.parse(req.body);
  const result = await salesService.createSale(input, req.user!.id);
  res.status(201).json(result);
}

export async function getSaleHandler(req: Request, res: Response) {
  const sale = await salesService.getSale(req.params.id);
  res.status(200).json({ sale });
}

export async function listSalesHandler(req: Request, res: Response) {
  const query = listSalesQuerySchema.parse(req.query);
  const result = await salesService.listSales(query);
  res.status(200).json(result);
}

export async function cancelSaleHandler(req: Request, res: Response) {
  const input = cancelSaleSchema.parse(req.body);
  const sale = await salesService.cancelSale(req.params.id, input, req.user!.id);
  res.status(200).json({ sale });
}

export async function returnSaleHandler(req: Request, res: Response) {
  const input = returnSaleSchema.parse(req.body);
  const sale = await salesService.returnSale(req.params.id, input, req.user!.id);
  res.status(200).json({ sale });
}
