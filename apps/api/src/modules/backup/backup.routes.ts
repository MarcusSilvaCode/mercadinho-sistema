import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { getLastBackupHandler, listBackupsHandler, runBackupHandler } from "./backup.controller.js";

export const backupRouter = Router();

backupRouter.use(requireAuth);

backupRouter.get("/", asyncHandler(listBackupsHandler));
backupRouter.get("/last", asyncHandler(getLastBackupHandler));
backupRouter.post("/run", asyncHandler(runBackupHandler));
