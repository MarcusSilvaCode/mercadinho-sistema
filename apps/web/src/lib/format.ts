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

export function formatTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(value: string | Date): string {
  return `${formatDate(value)} · ${formatTime(value)}`;
}

/** Zero nunca vira "-R$ 0,00": sinal só quando há valor. */
export function formatSignedCurrency(value: number | string, sign: "+" | "-"): string {
  const num = Math.abs(typeof value === "string" ? Number(value) : value);
  return num === 0 ? formatCurrency(0) : `${sign} ${formatCurrency(num)}`;
}
