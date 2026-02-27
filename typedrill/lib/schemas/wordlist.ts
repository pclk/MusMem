import { z } from "zod";

export const createWordListSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  words: z
    .array(z.string().min(1).max(50))
    .min(1, "Word list must contain at least one word")
    .max(10000, "Word list can contain at most 10,000 words"),
});

export type CreateWordListInput = z.infer<typeof createWordListSchema>;
