import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";
import { requireAuth } from "../../middlewares/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import {
  changePasswordHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  verifyPasswordHandler,
} from "./auth.controller.js";

const loginLimiter = rateLimit({
  windowMs: env.LOGIN_WINDOW_MINUTES * 60 * 1000,
  limit: env.LOGIN_MAX_ATTEMPTS,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas de login. Tente novamente mais tarde." },
});

export const authRouter = Router();

authRouter.post("/login", loginLimiter, asyncHandler(loginHandler));
authRouter.post("/logout", requireAuth, asyncHandler(logoutHandler));
authRouter.get("/me", requireAuth, asyncHandler(meHandler));
authRouter.post("/verify-password", requireAuth, asyncHandler(verifyPasswordHandler));
authRouter.post("/change-password", requireAuth, asyncHandler(changePasswordHandler));
