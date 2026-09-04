import type { Request, Response } from "express";
import { updateSettingsSchema } from "./settings.schema.js";
import * as settingsService from "./settings.service.js";

export async function getSettingsHandler(_req: Request, res: Response) {
  const settings = await settingsService.getSettings();
  res.status(200).json({ settings });
}

export async function updateSettingsHandler(req: Request, res: Response) {
  const input = updateSettingsSchema.parse(req.body);
  const settings = await settingsService.updateSettings(input, req.user!.id);
  res.status(200).json({ settings });
}
