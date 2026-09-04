import type { Request, Response } from "express";
import { createUserSchema, resetPasswordSchema, updateUserSchema } from "./users.schema.js";
import * as usersService from "./users.service.js";

export async function listUsersHandler(_req: Request, res: Response) {
  const users = await usersService.listUsers();
  res.status(200).json({ users });
}

export async function createUserHandler(req: Request, res: Response) {
  const input = createUserSchema.parse(req.body);
  const user = await usersService.createUser(input, req.user!.id);
  res.status(201).json({ user });
}

export async function updateUserHandler(req: Request, res: Response) {
  const input = updateUserSchema.parse(req.body);
  const user = await usersService.updateUser(req.params.id, input, req.user!.id);
  res.status(200).json({ user });
}

export async function resetPasswordHandler(req: Request, res: Response) {
  const input = resetPasswordSchema.parse(req.body);
  await usersService.resetPassword(req.params.id, req.user!.id, input);
  res.status(204).send();
}
