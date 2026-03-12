import { normalizeConfiguredKeymapCommand } from "@/lib/keymaps/commands";
import { KeymapListExerciseInput } from "@/lib/schemas/keymap-list";

export function serializeKeymapExercises(exercises: KeymapListExerciseInput[]): string {
  return exercises
    .map((exercise) => `${exercise.prompt} => ${exercise.acceptedInputs.join(", ")}`)
    .join("\n");
}

export function parseKeymapExercisesText(exercisesText: string): KeymapListExerciseInput[] {
  return exercisesText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const separatorIndex = line.indexOf("=>");
      if (separatorIndex === -1) {
        throw new Error('Each line must use "prompt => command1, command2" format');
      }

      const prompt = line.slice(0, separatorIndex).trim();
      const acceptedInputs = line
        .slice(separatorIndex + 2)
        .split(",")
        .map((value) => normalizeConfiguredKeymapCommand(value))
        .filter((value) => value.length > 0);

      if (!prompt || acceptedInputs.length === 0) {
        throw new Error('Each line must include both a prompt and at least one command after "=>"');
      }

      return { prompt, acceptedInputs };
    });
}
