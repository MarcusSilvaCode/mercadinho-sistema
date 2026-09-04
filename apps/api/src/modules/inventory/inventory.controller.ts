import type { Request, Response } from "express";
import { countItemSchema } from "./inventory.schema.js";
import * as inventoryService from "./inventory.service.js";

export async function startInventoryHandler(req: Request, res: Response) {
  const inventory = await inventoryService.startInventory(req.user!.id);
  res.status(201).json({ inventory });
}

export async function getInventoryHandler(req: Request, res: Response) {
  const inventory = await inventoryService.getInventory(req.params.id);
  res.status(200).json({ inventory });
}

export async function countItemHandler(req: Request, res: Response) {
  const input = countItemSchema.parse(req.body);
  const item = await inventoryService.countItem(req.params.id, input);
  res.status(200).json({ item });
}

export async function finishInventoryHandler(req: Request, res: Response) {
  const inventory = await inventoryService.finishInventory(req.params.id, req.user!.id);
  res.status(200).json({ inventory });
}
