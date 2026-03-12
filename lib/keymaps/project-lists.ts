import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseKeymapExercisesText } from "@/lib/keymaps/text";
import { KeymapListExerciseInput } from "@/lib/schemas/keymap-list";

export const PROJECT_KEYMAP_LISTS_DIR = path.join(process.cwd(), "keymap-lists");

export interface ProjectKeymapList {
  id: string;
  name: string;
  exercises: KeymapListExerciseInput[];
  sourceFile: string;
}

function formatKeymapListName(filename: string) {
  return filename
    .replace(/\.txt$/i, "")
    .split(/[-_]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export async function listProjectKeymapLists(): Promise<ProjectKeymapList[]> {
  let filenames: string[];

  try {
    filenames = await readdir(PROJECT_KEYMAP_LISTS_DIR);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const txtFiles = filenames.filter((filename) => filename.toLowerCase().endsWith(".txt"));

  const loaded = await Promise.all(
    txtFiles.map(async (filename) => {
      const sourceFile = path.join("keymap-lists", filename);
      const filePath = path.join(PROJECT_KEYMAP_LISTS_DIR, filename);
      const content = await readFile(filePath, "utf8");
      const exercises = parseKeymapExercisesText(content);

      if (exercises.length === 0) {
        return null;
      }

      return {
        id: `project-keymap-${filename.replace(/\.txt$/i, "").toLowerCase()}`,
        name: formatKeymapListName(filename),
        exercises,
        sourceFile,
      } satisfies ProjectKeymapList;
    })
  );

  return loaded
    .filter((entry): entry is ProjectKeymapList => entry !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}
