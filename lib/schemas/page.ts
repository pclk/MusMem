import { z } from "zod";

export const keystrokeSchema = z.object({
  char: z.string(),
  timestamp: z.number(),
  correct: z.boolean(),
});

export const pageCompleteSchema = z.object({
  targetText: z.string().min(1, "Target text is required"),
  typedText: z.string(),
  keystrokeTimings: z.array(keystrokeSchema),
});

export type Keystroke = z.infer<typeof keystrokeSchema>;
export type PageCompleteInput = z.infer<typeof pageCompleteSchema>;
