import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import {
  countItemHandler,
  finishInventoryHandler,
  getInventoryHandler,
  startInventoryHandler,
} from "./inventory.controller.js";

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth);

inventoryRouter.post("/", asyncHandler(startInventoryHandler));
inventoryRouter.get("/:id", asyncHandler(getInventoryHandler));
inventoryRouter.post("/:id/items", asyncHandler(countItemHandler));
inventoryRouter.post("/:id/finish", asyncHandler(finishInventoryHandler));
