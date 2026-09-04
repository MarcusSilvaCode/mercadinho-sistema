import { z } from "zod";

export const listAuditQuerySchema = z
  .object({
    userId: z.string().uuid().optional(),
    action: z.string().optional(),
    entity: z.string().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(30),
  })
  .refine((data) => !(data.from && !data.to) && !(data.to && !data.from), {
    message: "Informe 'from' e 'to' juntos, ou nenhum dos dois.",
    path: ["from"],
  });

export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;
