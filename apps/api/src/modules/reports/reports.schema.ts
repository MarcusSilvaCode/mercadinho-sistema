import { z } from "zod";

const presetEnum = z.enum(["hoje", "ontem", "ultimos_7_dias", "este_mes", "mes_anterior"]);

export const periodQuerySchema = z
  .object({
    preset: presetEnum.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((data) => !(data.preset && (data.from || data.to)), {
    message: "Informe um preset OU um período personalizado (from/to), nunca os dois.",
    path: ["preset"],
  })
  .refine((data) => !(data.from && !data.to) && !(data.to && !data.from), {
    message: "Período personalizado exige from e to juntos.",
    path: ["from"],
  });

export const topProductsQuerySchema = periodQuerySchema.and(
  z.object({ limit: z.coerce.number().int().positive().max(50).default(10) }),
);

export type PeriodQuery = z.infer<typeof periodQuerySchema>;
export type TopProductsQuery = z.infer<typeof topProductsQuerySchema>;
