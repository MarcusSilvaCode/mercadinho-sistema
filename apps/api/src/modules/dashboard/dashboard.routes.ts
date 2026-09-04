import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { getDashboardSummaryHandler } from "./dashboard.controller.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", asyncHandler(getDashboardSummaryHandler));
