import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Informe o usuário."),
  password: z.string().min(1, "Informe a senha."),
});

export const verifyPasswordSchema = z.object({
  password: z.string().min(1, "Informe a senha."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyPasswordInput = z.infer<typeof verifyPasswordSchema>;
