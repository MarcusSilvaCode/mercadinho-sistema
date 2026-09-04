import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
  JWT_SECRET: z.string().min(10, "JWT_SECRET deve ter pelo menos 10 caracteres"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().default(5),
  LOGIN_WINDOW_MINUTES: z.coerce.number().default(15),
  SESSION_TIMEOUT_MINUTES: z.coerce.number().default(15),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
  throw new Error("Configuração de ambiente inválida. Verifique o arquivo .env");
}

export const env = parsed.data;
