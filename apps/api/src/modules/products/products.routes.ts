import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import {
  createProductHandler,
  getPriceHistoryHandler,
  getProductByBarcodeHandler,
  listProductsHandler,
  suggestPriceHandler,
  updateProductHandler,
} from "./products.controller.js";

export const productsRouter = Router();

productsRouter.use(requireAuth);

productsRouter.get("/", asyncHandler(listProductsHandler));
productsRouter.post("/", asyncHandler(createProductHandler));
productsRouter.get("/suggest-price", asyncHandler(suggestPriceHandler));
productsRouter.get("/barcode/:barcode", asyncHandler(getProductByBarcodeHandler));
productsRouter.patch("/:id", asyncHandler(updateProductHandler));
productsRouter.get("/:id/price-history", asyncHandler(getPriceHistoryHandler));
