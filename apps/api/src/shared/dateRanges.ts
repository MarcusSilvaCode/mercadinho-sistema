export type ReportPreset = "hoje" | "ontem" | "ultimos_7_dias" | "este_mes" | "mes_anterior";

interface DateRange {
  start: Date;
  end: Date; // exclusivo
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function resolvePreset(preset: ReportPreset): DateRange {
  const today = startOfDay(new Date());

  switch (preset) {
    case "hoje":
      return { start: today, end: addDays(today, 1) };
    case "ontem":
      return { start: addDays(today, -1), end: today };
    case "ultimos_7_dias":
      return { start: addDays(today, -6), end: addDays(today, 1) };
    case "este_mes": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start, end: addDays(today, 1) };
    }
    case "mes_anterior": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start, end };
    }
  }
}

interface ResolveDateRangeInput {
  preset?: ReportPreset;
  from?: Date;
  to?: Date;
}

/**
 * Resolve o período do relatório a partir de um preset OU de um intervalo
 * explícito (from/to). Nunca os dois — quem decide isso é o schema Zod da
 * rota, que valida a exclusividade antes de chegar aqui. Sem nenhum dos
 * dois, cai em "hoje" como padrão seguro.
 */
export function resolveDateRange({ preset, from, to }: ResolveDateRangeInput): DateRange {
  if (preset) return resolvePreset(preset);

  if (from && to) {
    return { start: startOfDay(from), end: addDays(startOfDay(to), 1) };
  }

  return resolvePreset("hoje");
}
