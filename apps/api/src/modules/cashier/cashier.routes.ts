import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import {
  closeCashierHandler,
  getClosingSummaryHandler,
  getCurrentSessionHandler,
  openCashierHandler,
  registerCashMovementHandler,
} from "./cashier.controller.js";

export const cashierRouter = Router();

cashierRouter.use(requireAuth);

cashierRouter.get("/current", asyncHandler(getCurrentSessionHandler));
cashierRouter.post("/open", asyncHandler(openCashierHandler));
cashierRouter.post("/movements", asyncHandler(registerCashMovementHandler));
cashierRouter.get("/:id/summary", asyncHandler(getClosingSummaryHandler));
cashierRouter.post("/:id/close", asyncHandler(closeCashierHandler));
