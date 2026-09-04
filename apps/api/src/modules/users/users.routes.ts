import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import {
  createUserHandler,
  listUsersHandler,
  resetPasswordHandler,
  updateUserHandler,
} from "./users.controller.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get("/", asyncHandler(listUsersHandler));
usersRouter.post("/", asyncHandler(createUserHandler));
usersRouter.patch("/:id", asyncHandler(updateUserHandler));
usersRouter.post("/:id/reset-password", asyncHandler(resetPasswordHandler));
