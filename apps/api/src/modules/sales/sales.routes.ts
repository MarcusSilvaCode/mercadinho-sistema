import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import {
  cancelSaleHandler,
  createSaleHandler,
  getSaleHandler,
  listSalesHandler,
  returnSaleHandler,
} from "./sales.controller.js";

export const salesRouter = Router();

salesRouter.use(requireAuth);

salesRouter.get("/", asyncHandler(listSalesHandler));
salesRouter.post("/", asyncHandler(createSaleHandler));
salesRouter.get("/:id", asyncHandler(getSaleHandler));
salesRouter.post("/:id/cancel", asyncHandler(cancelSaleHandler));
salesRouter.post("/:id/return", asyncHandler(returnSaleHandler));
