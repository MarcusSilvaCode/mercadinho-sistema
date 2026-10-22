import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { changePasswordSchema, loginSchema, verifyPasswordSchema } from "./auth.schema.js";
import * as authService from "./auth.service.js";
import { COOKIE_NAME } from "../../middlewares/auth.js";

const isProd = env.NODE_ENV === "production";

export async function loginHandler(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const { token, user } = await authService.login(input);

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000, // 8h
  });

  res.status(200).json({ user });
}

export async function logoutHandler(req: Request, res: Response) {
  if (req.user) {
    await authService.logout(req.user.id);
  }
  res.clearCookie(COOKIE_NAME);
  res.status(204).send();
}

export async function meHandler(req: Request, res: Response) {
  res.status(200).json({ user: req.user });
}

export async function verifyPasswordHandler(req: Request, res: Response) {
  const { password } = verifyPasswordSchema.parse(req.body);
  await authService.verifyPassword(req.user!.id, password);
  res.status(200).json({ ok: true });
}

export async function changePasswordHandler(req: Request, res: Response) {
  const input = changePasswordSchema.parse(req.body);
  await authService.changeOwnPassword(req.user!.id, input);
  res.status(204).send();
}
