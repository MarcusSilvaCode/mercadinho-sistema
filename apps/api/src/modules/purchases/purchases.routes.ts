import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { createPurchaseHandler, getPurchaseHandler, listPurchasesHandler } from "./purchases.controller.js";

export const purchasesRouter = Router();

purchasesRouter.use(requireAuth);

purchasesRouter.get("/", asyncHandler(listPurchasesHandler));
purchasesRouter.post("/", asyncHandler(createPurchaseHandler));
purchasesRouter.get("/:id", asyncHandler(getPurchaseHandler));
