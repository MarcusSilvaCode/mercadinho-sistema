/** Mesma regra de `apps/api/src/shared/pricing.ts`: custo × (1 + margem%) arredondado a centavos. */
export function suggestSalePrice(costPrice: number, marginPercent: number): number {
  const suggested = costPrice * (1 + marginPercent / 100);
  return Math.round(suggested * 100) / 100;
}

/** Aceita "4,50", "4.50" ou "R$ 4,50" (teclado do celular) — retorna NaN se inválido. */
export function parseMoneyInput(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  return cleaned === "" ? NaN : Number(cleaned);
}
