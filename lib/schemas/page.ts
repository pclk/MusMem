import { z } from "zod";

export const keystrokeSchema = z.object({
  char: z.string(),
  timestamp: z.number(),
  correct: z.boolean(),
});

const textPageCompleteSchema = z.object({
  mode: z.literal("TEXT"),
  targetText: z.string().min(1, "Target text is required"),
  typedText: z.string(),
  keystrokeTimings: z.array(keystrokeSchema),
});

const keymapPageCompleteSchema = z.object({
  mode: z.literal("KEYMAP"),
  exerciseId: z.string().min(1),
  prompt: z.string().min(1),
  typedCommand: z.string(),
  acceptedInputs: z.array(z.string().min(1)).min(1),
  correct: z.boolean(),
  latencyMs: z.number().int().nonnegative(),
  keystrokeTimings: z.array(keystrokeSchema),
});

export const pageCompleteSchema = z.discriminatedUnion("mode", [
  textPageCompleteSchema,
  keymapPageCompleteSchema,
]);
export type PageCompleteInput = z.infer<typeof pageCompleteSchema>;
