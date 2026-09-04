/** Arredonda para 2 casas decimais, evitando erros de ponto flutuante acumulados. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
