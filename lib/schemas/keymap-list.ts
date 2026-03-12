import { z } from "zod";
import { normalizeConfiguredKeymapCommand } from "@/lib/keymaps/commands";

const keymapCommandSchema = z
  .string()
  .min(1, "Command is required")
  .max(40, "Command must be at most 40 characters")
  .superRefine((value, ctx) => {
    try {
      normalizeConfiguredKeymapCommand(value);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : "Invalid command",
      });
    }
  })
  .transform((value) => normalizeConfiguredKeymapCommand(value));

export const keymapExerciseSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(120, "Prompt must be at most 120 characters"),
  acceptedInputs: z
    .array(keymapCommandSchema)
    .min(1, "At least one command is required")
    .max(10, "At most 10 command variants are allowed"),
});

export const keymapExercisesSchema = z
  .array(keymapExerciseSchema)
  .min(1, "Keymap list must contain at least one exercise")
  .max(1000, "Keymap list can contain at most 1,000 exercises");

export const createKeymapListSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  exercises: keymapExercisesSchema,
});

export const updateKeymapListSchema = createKeymapListSchema;

export type KeymapListExerciseInput = z.infer<typeof keymapExerciseSchema>;
