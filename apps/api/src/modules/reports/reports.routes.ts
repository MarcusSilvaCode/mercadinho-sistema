import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import {
  byPaymentHandler,
  byProductHandler,
  byUserHandler,
  financialHandler,
  mostProfitableHandler,
  mostSoldHandler,
} from "./reports.controller.js";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

reportsRouter.get("/financial", asyncHandler(financialHandler));
reportsRouter.get("/sales/by-payment", asyncHandler(byPaymentHandler));
reportsRouter.get("/sales/by-user", asyncHandler(byUserHandler));
reportsRouter.get("/sales/by-product", asyncHandler(byProductHandler));
reportsRouter.get("/products/most-sold", asyncHandler(mostSoldHandler));
reportsRouter.get("/products/most-profitable", asyncHandler(mostProfitableHandler));
