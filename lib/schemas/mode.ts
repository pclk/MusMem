import { z } from "zod";

export const practiceModeSchema = z.enum(["TEXT", "KEYMAP"]);

export type PracticeMode = z.infer<typeof practiceModeSchema>;
