import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middlewares/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import {
  commitImportHandler,
  exportProductsHandler,
  importTemplateHandler,
  previewImportHandler,
} from "./importExport.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".csv", ".xlsx"];
    const isAllowed = allowed.some((ext) => file.originalname.toLowerCase().endsWith(ext));
    if (!isAllowed) {
      cb(new Error("Formato de arquivo não suportado. Envie um .csv ou .xlsx."));
      return;
    }
    cb(null, true);
  },
});

export const importExportRouter = Router();

importExportRouter.use(requireAuth);

importExportRouter.get("/products/template", asyncHandler(importTemplateHandler));
importExportRouter.get("/products/export", asyncHandler(exportProductsHandler));
importExportRouter.post("/products/preview", upload.single("file"), asyncHandler(previewImportHandler));
importExportRouter.post("/products/commit", asyncHandler(commitImportHandler));
