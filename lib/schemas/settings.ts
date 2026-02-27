import { z } from "zod";

export const updateSettingsSchema = z.object({
  charsPerPage: z.number().int().min(50).max(500).optional(),
  targetedPracticeRatio: z.number().int().min(0).max(100).optional(),
  activeListId: z.string().nullable().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
