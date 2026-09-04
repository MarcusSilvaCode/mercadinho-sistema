import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { logAudit } from "../../shared/audit.js";
import type { CashMovementInput, CloseCashierInput, OpenCashierInput } from "./cashier.schema.js";

const PAYMENT_METHODS = ["DINHEIRO", "PIX", "DEBITO", "CREDITO"] as const;

interface SessionTotals {
  totalSold: number;
  paymentTotals: Record<(typeof PAYMENT_METHODS)[number], number>;
  sangrias: number;
  suprimentos: number;
  expectedCash: number;
}

/**
 * Recalcula os totais da sessão a partir das vendas concluídas e das
 * movimentações de caixa reais — nunca de um contador acumulado, para
 * nunca divergir por bug de soma incremental.
 */
async function computeSessionTotals(sessionId: string, openingAmount: number): Promise<SessionTotals> {
  const [sales, movements] = await Promise.all([
    prisma.sale.findMany({
      // Vendas canceladas nunca chegaram a ser efetivamente recebidas em
      // dinheiro, então saem do cálculo. Devoluções (parcial/total) já
      // tiveram o dinheiro recebido no momento da venda — o estorno em
      // si fica fora do escopo do MVP (seção 43 exclui contas a pagar/
      // receber), então continuam contando nos totais do caixa.
      where: { cashierSessionId: sessionId, status: { in: ["CONCLUIDA", "DEVOLVIDA_PARCIAL", "DEVOLVIDA_TOTAL"] } },
      include: { payments: true },
    }),
    prisma.cashMovement.findMany({ where: { cashierSessionId: sessionId } }),
  ]);

  const paymentTotals: SessionTotals["paymentTotals"] = { DINHEIRO: 0, PIX: 0, DEBITO: 0, CREDITO: 0 };
  let totalSold = 0;

  for (const sale of sales) {
    totalSold += Number(sale.total);
    for (const payment of sale.payments) {
      paymentTotals[payment.method] += Number(payment.amount);
    }
  }

  let sangrias = 0;
  let suprimentos = 0;
  for (const movement of movements) {
    if (movement.type === "SANGRIA") sangrias += Number(movement.amount);
    else suprimentos += Number(movement.amount);
  }

  // Dinheiro esperado = abertura + vendas em dinheiro - sangrias + suprimentos.
  // PIX/débito/crédito nunca entram nessa conta (seção 25 da especificação).
  const expectedCash = openingAmount + paymentTotals.DINHEIRO - sangrias + suprimentos;

  return { totalSold, paymentTotals, sangrias, suprimentos, expectedCash };
}

export async function getCurrentSession() {
  const session = await prisma.cashierSession.findFirst({
    where: { status: "ABERTO" },
    include: { user: { select: { fullName: true } } },
  });

  if (!session) return null;

  const totals = await computeSessionTotals(session.id, Number(session.openingAmount));
  return { session, totals };
}

export async function openCashier(input: OpenCashierInput, userId: string) {
  const existing = await prisma.cashierSession.findFirst({ where: { status: "ABERTO" } });
  if (existing) {
    throw new AppError("Já existe um caixa aberto. Feche-o antes de abrir outro.", 400);
  }

  const session = await prisma.cashierSession.create({
    data: { userId, openingAmount: input.openingAmount, status: "ABERTO" },
  });

  await logAudit({
    userId,
    action: "CAIXA_ABERTO",
    entity: "CashierSession",
    entityId: session.id,
    details: { openingAmount: input.openingAmount },
  });

  return session;
}

async function getOpenSessionOrThrow() {
  const session = await prisma.cashierSession.findFirst({ where: { status: "ABERTO" } });
  if (!session) {
    throw new AppError("Não há caixa aberto no momento.", 400);
  }
  return session;
}

export async function registerCashMovement(input: CashMovementInput, userId: string) {
  const session = await getOpenSessionOrThrow();

  const movement = await prisma.cashMovement.create({
    data: {
      cashierSessionId: session.id,
      type: input.type,
      amount: input.amount,
      reason: input.reason,
      userId,
    },
  });

  await logAudit({
    userId,
    action: input.type === "SANGRIA" ? "SANGRIA_REGISTRADA" : "SUPRIMENTO_REGISTRADO",
    entity: "CashierSession",
    entityId: session.id,
    details: { amount: input.amount, reason: input.reason },
  });

  return movement;
}

export async function getClosingSummary(sessionId: string) {
  const session = await prisma.cashierSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    throw new AppError("Caixa não encontrado.", 404);
  }
  if (session.status !== "ABERTO") {
    throw new AppError("Este caixa já está fechado.", 400);
  }

  const totals = await computeSessionTotals(sessionId, Number(session.openingAmount));
  return { session, totals };
}

export async function closeCashier(sessionId: string, input: CloseCashierInput, userId: string) {
  const session = await prisma.cashierSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    throw new AppError("Caixa não encontrado.", 404);
  }
  if (session.status !== "ABERTO") {
    throw new AppError("Este caixa já está fechado.", 400);
  }

  const totals = await computeSessionTotals(sessionId, Number(session.openingAmount));
  const difference = input.countedCash - totals.expectedCash;

  const updated = await prisma.cashierSession.update({
    where: { id: sessionId },
    data: {
      status: "FECHADO",
      closingCountedCash: input.countedCash,
      closingExpectedCash: totals.expectedCash,
      closingDifference: difference,
      closedAt: new Date(),
    },
  });

  await logAudit({
    userId,
    action: "CAIXA_FECHADO",
    entity: "CashierSession",
    entityId: sessionId,
    details: { ...totals, countedCash: input.countedCash, difference },
  });

  return { session: updated, totals, difference };
}
