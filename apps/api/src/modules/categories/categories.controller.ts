import type { Request, Response } from "express";
import { createCategorySchema, updateCategorySchema } from "./categories.schema.js";
import * as categoriesService from "./categories.service.js";

export async function listCategoriesHandler(req: Request, res: Response) {
  const includeInactive = req.query.includeInactive === "true";
  const categories = await categoriesService.listCategories(includeInactive);
  res.status(200).json({ categories });
}

export async function createCategoryHandler(req: Request, res: Response) {
  const input = createCategorySchema.parse(req.body);
  const category = await categoriesService.createCategory(input, req.user!.id);
  res.status(201).json({ category });
}

export async function updateCategoryHandler(req: Request, res: Response) {
  const input = updateCategorySchema.parse(req.body);
  const category = await categoriesService.updateCategory(req.params.id, input, req.user!.id);
  res.status(200).json({ category });
}
