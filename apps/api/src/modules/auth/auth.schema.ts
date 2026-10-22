import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Informe o usuário."),
  password: z.string().min(1, "Informe a senha."),
});

export const verifyPasswordSchema = z.object({
  password: z.string().min(1, "Informe a senha."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "A nova senha deve ser diferente da atual.",
    path: ["newPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyPasswordInput = z.infer<typeof verifyPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
