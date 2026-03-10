import { z } from "zod";
import { practiceModeSchema } from "@/lib/schemas/mode";

export const updateSettingsSchema = z.object({
  charsPerPage: z.number().int().min(50).max(500).optional(),
  targetedPracticeRatio: z.number().int().min(0).max(100).optional(),
  mode: practiceModeSchema.optional(),
  activeListId: z.string().nullable().optional(),
});
