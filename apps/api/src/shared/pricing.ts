/**
 * Calcula o preço de venda sugerido a partir do custo e da margem (%).
 * Função pura, sem efeito colateral — o chamador decide se aplica ou não.
 *
 * Exemplo: custo 6.00, margem 40% -> 8.40
 */
export function suggestSalePrice(costPrice: number, marginPercent: number): number {
  const suggested = costPrice * (1 + marginPercent / 100);
  return Math.round(suggested * 100) / 100;
}

/**
 * Calcula a margem (%) resultante de um par custo/venda.
 * Usado para recalcular a margem exibida quando o usuário edita o preço
 * de venda diretamente em vez de aceitar a sugestão.
 */
export function calculateMargin(costPrice: number, salePrice: number): number {
  if (costPrice <= 0) return 0;
  const margin = ((salePrice - costPrice) / costPrice) * 100;
  return Math.round(margin * 100) / 100;
}
