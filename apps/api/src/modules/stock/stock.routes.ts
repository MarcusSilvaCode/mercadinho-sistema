import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { adjustStockHandler, expirationAlertsHandler, listMovementsHandler } from "./stock.controller.js";

export const stockRouter = Router();

stockRouter.use(requireAuth);

stockRouter.post("/adjust", asyncHandler(adjustStockHandler));
stockRouter.get("/movements", asyncHandler(listMovementsHandler));
stockRouter.get("/alerts/expiration", asyncHandler(expirationAlertsHandler));
