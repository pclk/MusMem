import { describe, expect, it } from "vitest";
import {
  listProjectKeymapLists,
  PROJECT_KEYMAP_LISTS_DIR,
} from "@/lib/keymaps/project-lists";
import { parseKeymapExercisesText, serializeKeymapExercises } from "@/lib/keymaps/text";

describe("keymap text formatting", () => {
  it("parses text exercises with modifier commands", () => {
    expect(
      parseKeymapExercisesText("open command palette => ctrl+shift+p\nterminal => ctrl+`")
    ).toEqual([
      { prompt: "open command palette", acceptedInputs: ["Ctrl+Shift+p"] },
      { prompt: "terminal", acceptedInputs: ["Ctrl+`"] },
    ]);
  });

  it("serializes exercises to prompt => command lines", () => {
    expect(
      serializeKeymapExercises([
        { prompt: "save file", acceptedInputs: ["Ctrl+s"] },
      ])
    ).toBe("save file => Ctrl+s");
  });
});

describe("project keymap list loader", () => {
  it("loads .txt files from the project keymap-lists directory", async () => {
    const lists = await listProjectKeymapLists();

    expect(PROJECT_KEYMAP_LISTS_DIR.endsWith("/keymap-lists")).toBe(true);
    expect(lists).toContainEqual({
      id: "project-keymap-ctrl-shortcuts",
      name: "Ctrl Shortcuts",
      exercises: [
        { prompt: "open command palette", acceptedInputs: ["Ctrl+Shift+p"] },
        { prompt: "save file", acceptedInputs: ["Ctrl+s"] },
        { prompt: "toggle terminal", acceptedInputs: ["Ctrl+`"] },
      ],
      sourceFile: "keymap-lists/ctrl-shortcuts.txt",
    });
  });
});
