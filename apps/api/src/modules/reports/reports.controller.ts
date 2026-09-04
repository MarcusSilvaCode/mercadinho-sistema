import type { Request, Response } from "express";
import { periodQuerySchema, topProductsQuerySchema } from "./reports.schema.js";
import * as reportsService from "./reports.service.js";

export async function financialHandler(req: Request, res: Response) {
  const query = periodQuerySchema.parse(req.query);
  const result = await reportsService.getFinancialReport(query);
  res.status(200).json(result);
}

export async function byPaymentHandler(req: Request, res: Response) {
  const query = periodQuerySchema.parse(req.query);
  const result = await reportsService.getSalesByPayment(query);
  res.status(200).json(result);
}

export async function byUserHandler(req: Request, res: Response) {
  const query = periodQuerySchema.parse(req.query);
  const result = await reportsService.getSalesByUser(query);
  res.status(200).json(result);
}

export async function byProductHandler(req: Request, res: Response) {
  const query = periodQuerySchema.parse(req.query);
  const result = await reportsService.getSalesByProduct(query);
  res.status(200).json(result);
}

export async function mostSoldHandler(req: Request, res: Response) {
  const query = topProductsQuerySchema.parse(req.query);
  const result = await reportsService.getMostSoldProducts(query);
  res.status(200).json(result);
}

export async function mostProfitableHandler(req: Request, res: Response) {
  const query = topProductsQuerySchema.parse(req.query);
  const result = await reportsService.getMostProfitableProducts(query);
  res.status(200).json(result);
}
