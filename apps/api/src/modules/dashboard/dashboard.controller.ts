import type { Request, Response } from "express";
import * as dashboardService from "./dashboard.service.js";

export async function getDashboardSummaryHandler(_req: Request, res: Response) {
  const summary = await dashboardService.getDashboardSummary();
  res.status(200).json(summary);
}
