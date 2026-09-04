export function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("pt-BR");
}

export const UNIT_LABELS: Record<string, string> = {
  UN: "Unidade",
  CX: "Caixa",
  FD: "Fardo",
  PCT: "Pacote",
  L: "Litro",
  ML: "Mililitro",
  G: "Grama",
  KG: "Quilograma",
};
