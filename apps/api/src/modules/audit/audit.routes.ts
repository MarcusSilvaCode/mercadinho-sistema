import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { listAuditLogsHandler } from "./audit.controller.js";

export const auditRouter = Router();

auditRouter.use(requireAuth);

auditRouter.get("/", asyncHandler(listAuditLogsHandler));
