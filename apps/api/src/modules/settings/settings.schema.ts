import { z } from "zod";

export const updateSettingsSchema = z.object({
  storeName: z.string().min(2).optional(),
  shortName: z.string().optional(),
  document: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  logoUrl: z.string().optional(),
  defaultMargin: z.coerce.number().nonnegative().optional(),
  maxDiscountPercent: z.coerce.number().nonnegative().max(100).optional(),
  sessionTimeoutMin: z.coerce.number().int().positive().optional(),
  backupDayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
  backupHour: z.coerce.number().int().min(0).max(23).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
