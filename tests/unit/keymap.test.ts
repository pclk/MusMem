import { describe, it, expect } from "vitest";
import { vimBasicExercises } from "@/lib/keymaps/vim-basic";
import { selectKeymapExercise } from "@/lib/keymaps/select-exercise";

describe("keymap curriculum", () => {
  it("contains ciw mapping for change inside word", () => {
    const ciw = vimBasicExercises.find((item) => item.prompt === "change inside word");
    expect(ciw?.acceptedInputs).toContain("ciw");
  });

  it("avoids immediate repeats when possible", () => {
    const sample = selectKeymapExercise("vim-ciw");
    if (vimBasicExercises.length > 1) {
      expect(sample.id).not.toBe("vim-ciw");
    }
  });
});
