import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { logAudit } from "../../shared/audit.js";
import type { CreateCategoryInput, UpdateCategoryInput } from "./categories.schema.js";

export async function listCategories(includeInactive: boolean) {
  return prisma.category.findMany({
    where: includeInactive ? {} : { active: true },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(input: CreateCategoryInput, userId: string) {
  const category = await prisma.category.create({ data: { name: input.name } });

  await logAudit({
    userId,
    action: "CATEGORIA_CRIADA",
    entity: "Category",
    entityId: category.id,
    details: { name: category.name },
  });

  return category;
}

export async function updateCategory(id: string, input: UpdateCategoryInput, userId: string) {
  // Inativar é sempre permitido; reativar também. Só o nome é bloqueado
  // implicitamente pela unicidade do banco (@unique já cobre duplicidade).
  const category = await prisma.category.update({
    where: { id },
    data: input,
  });

  await logAudit({
    userId,
    action: input.active === false ? "CATEGORIA_INATIVADA" : "CATEGORIA_ALTERADA",
    entity: "Category",
    entityId: category.id,
    details: input,
  });

  return category;
}

/**
 * Não existe exclusão física de categoria no sistema — apenas inativação.
 * Esta função existe só para reforçar a regra em um único lugar, caso
 * algum endpoint futuro tente chamar um "delete" por engano.
 */
export async function assertCanDeactivate(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!category) {
    throw new AppError("Categoria não encontrada.", 404);
  }

  return category;
}
