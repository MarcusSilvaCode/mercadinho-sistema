import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { categoriesRouter } from "./modules/categories/categories.routes.js";
import { productsRouter } from "./modules/products/products.routes.js";
import { stockRouter } from "./modules/stock/stock.routes.js";
import { inventoryRouter } from "./modules/inventory/inventory.routes.js";
import { purchasesRouter } from "./modules/purchases/purchases.routes.js";
import { cashierRouter } from "./modules/cashier/cashier.routes.js";
import { salesRouter } from "./modules/sales/sales.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { auditRouter } from "./modules/audit/audit.routes.js";
import { importExportRouter } from "./modules/importExport/importExport.routes.js";
import { settingsRouter } from "./modules/settings/settings.routes.js";
import { backupRouter } from "./modules/backup/backup.routes.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

// Rate limit geral da API — mais generoso que o do login (Fase 3), serve
// como segunda camada de defesa contra abuso/varredura em qualquer rota,
// não só autenticação.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições. Aguarde alguns minutos e tente novamente." },
});

export function createApp() {
  const app = express();

  // Em produção, o servidor normalmente roda atrás de um proxy reverso
  // (Nginx/Caddy) — sem isso, req.ip veria sempre o IP do proxy, e o rate
  // limiting (login e geral) puniria todo mundo junto em vez de por IP real.
  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", apiLimiter);

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Acessível pelo site (o nginx só repassa /api): confirma que a API alcança o banco
  app.get("/api/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", banco: "ok" });
    } catch {
      res.status(503).json({ status: "erro", banco: "fora" });
    }
  });

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/stock", stockRouter);
  app.use("/api/inventory", inventoryRouter);
  app.use("/api/purchases", purchasesRouter);
  app.use("/api/cashier", cashierRouter);
  app.use("/api/sales", salesRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/audit", auditRouter);
  app.use("/api/import-export", importExportRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/backup", backupRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
