import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import {
  createCategoryHandler,
  listCategoriesHandler,
  updateCategoryHandler,
} from "./categories.controller.js";

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);

categoriesRouter.get("/", asyncHandler(listCategoriesHandler));
categoriesRouter.post("/", asyncHandler(createCategoryHandler));
categoriesRouter.patch("/:id", asyncHandler(updateCategoryHandler));
