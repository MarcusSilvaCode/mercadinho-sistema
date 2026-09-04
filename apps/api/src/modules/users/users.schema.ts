import { z } from "zod";

export const createUserSchema = z
  .object({
    fullName: z.string().min(3, "Nome completo deve ter pelo menos 3 caracteres."),
    username: z
      .string()
      .min(3, "Usuário deve ter pelo menos 3 caracteres.")
      .regex(/^[a-z0-9._-]+$/i, "Usuário deve conter apenas letras, números, ponto, hífen ou underscore."),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export const updateUserSchema = z.object({
  fullName: z.string().min(3).optional(),
  active: z.boolean().optional(),
});

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
