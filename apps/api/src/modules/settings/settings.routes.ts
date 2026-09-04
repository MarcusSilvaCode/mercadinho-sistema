import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { getSettingsHandler, updateSettingsHandler } from "./settings.controller.js";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

settingsRouter.get("/", asyncHandler(getSettingsHandler));
settingsRouter.patch("/", asyncHandler(updateSettingsHandler));
