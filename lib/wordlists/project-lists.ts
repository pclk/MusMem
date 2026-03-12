import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseWordListText } from "@/lib/wordlists/text";

export const PROJECT_WORDLISTS_DIR = path.join(process.cwd(), "wordlists");

export interface ProjectWordList {
  id: string;
  name: string;
  words: string[];
  sourceFile: string;
}

function formatWordListName(filename: string) {
  return filename
    .replace(/\.txt$/i, "")
    .split(/[-_]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export async function listProjectWordLists(): Promise<ProjectWordList[]> {
  let filenames: string[];

  try {
    filenames = await readdir(PROJECT_WORDLISTS_DIR);
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
      const sourceFile = path.join("wordlists", filename);
      const filePath = path.join(PROJECT_WORDLISTS_DIR, filename);
      const content = await readFile(filePath, "utf8");
      const words = parseWordListText(content);

      if (words.length === 0) {
        return null;
      }

      return {
        id: `project-${filename.replace(/\.txt$/i, "").toLowerCase()}`,
        name: formatWordListName(filename),
        words,
        sourceFile,
      } satisfies ProjectWordList;
    })
  );

  return loaded
    .filter((entry): entry is ProjectWordList => entry !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}
