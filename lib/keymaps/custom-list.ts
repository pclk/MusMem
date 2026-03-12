import { KeymapExercise } from "@/lib/keymaps/vim-basic";
import {
  keymapExercisesSchema,
  KeymapListExerciseInput,
} from "@/lib/schemas/keymap-list";
import { normalizeConfiguredKeymapCommand } from "@/lib/keymaps/commands";

function slugifySegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function parseKeymapListEntries(value: unknown): KeymapListExerciseInput[] {
  return keymapExercisesSchema.parse(value);
}

export function buildKeymapExercisesFromList(
  listId: string,
  entries: KeymapListExerciseInput[]
): KeymapExercise[] {
  return entries.map((entry, index) => {
    const normalizedInputs = entry.acceptedInputs.map((input) =>
      normalizeConfiguredKeymapCommand(input)
    );
    const commandSegment = slugifySegment(normalizedInputs.join("-")) || `exercise-${index + 1}`;
    const promptSegment = slugifySegment(entry.prompt) || `prompt-${index + 1}`;

    return {
      id: `custom-${listId}-${promptSegment}-${commandSegment}-${index}`,
      prompt: entry.prompt,
      acceptedInputs: normalizedInputs,
      tags: ["custom"],
      difficulty: "easy",
      lesson: "custom",
    };
  });
}
