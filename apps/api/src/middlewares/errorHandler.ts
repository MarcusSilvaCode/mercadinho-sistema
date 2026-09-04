import type { NextFunction, Request, Response } from "express";
import { AppError } from "../shared/AppError.js";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: "Dados inválidos.",
      issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  // Checagem defensiva: em cenários onde o client do Prisma não foi
  // corretamente gerado/inicializado (ex: `prisma generate` nunca rodou),
  // `Prisma.PrismaClientKnownRequestError` pode não existir como classe,
  // e um `instanceof` direto contra `undefined` lançaria TypeError — ou
  // seja, o PRÓPRIO tratador de erros quebraria ao tentar tratar um erro.
  // Esta rota nunca pode ser a que derruba a aplicação, então a checagem
  // de existência vem antes do `instanceof`.
  const PrismaKnownRequestError = (Prisma as typeof Prisma | undefined)?.PrismaClientKnownRequestError;
  if (PrismaKnownRequestError && err instanceof PrismaKnownRequestError) {
    if (err.code === "P2002") {
      const fields = (err.meta?.target as string[] | undefined)?.join(", ") ?? "campo";
      return res.status(409).json({ error: `Já existe um registro com este ${fields}.` });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Registro não encontrado." });
    }
  }

  console.error("Erro não tratado:", err);
  return res.status(500).json({ error: "Erro interno do servidor." });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Rota não encontrada." });
}
