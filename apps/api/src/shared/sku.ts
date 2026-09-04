import { prisma } from "../config/prisma.js";
import { AppError } from "./AppError.js";

function randomCode(): string {
  // 6 caracteres em base36 (letras+números), ex: "A1B2C3"
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * Gera um SKU único no formato PRD-XXXXXX. Tenta algumas vezes em caso de
 * colisão (estatisticamente quase impossível, mas o código não confia
 * apenas na sorte — a unicidade real é garantida pela constraint do banco).
 */
export async function generateUniqueSku(maxAttempts = 5): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = `PRD-${randomCode()}`;
    const existing = await prisma.product.findUnique({ where: { sku: candidate } });
    if (!existing) return candidate;
  }
  throw new AppError("Não foi possível gerar um SKU único. Tente novamente.", 500);
}
