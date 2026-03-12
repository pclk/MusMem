import { describe, it, expect } from "vitest";
import { vimBasicExercises } from "@/lib/keymaps/vim-basic";
import { fillKeymapExerciseQueue, selectKeymapExercise, selectKeymapExerciseFromPool } from "@/lib/keymaps/select-exercise";

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

  it("fills an upcoming queue without immediate repeats", () => {
    const queue = fillKeymapExerciseQueue([], 4, "vim-ciw");

    expect(queue).toHaveLength(4);
    if (vimBasicExercises.length > 1) {
      expect(queue[0]?.id).not.toBe("vim-ciw");
      for (let i = 1; i < queue.length; i += 1) {
        expect(queue[i]?.id).not.toBe(queue[i - 1]?.id);
      }
    }
  });

  it("fills a queue from the provided custom pool only", () => {
    const customPool = [
      { id: "custom-a", prompt: "first", acceptedInputs: ["a"] },
      { id: "custom-b", prompt: "second", acceptedInputs: ["b"] },
    ];

    const queue = fillKeymapExerciseQueue([customPool[0]], 4, "custom-a", customPool);

    expect(queue).toHaveLength(4);
    for (const exercise of queue) {
      expect(customPool.map((item) => item.id)).toContain(exercise.id);
    }
  });

  it("selects from a provided pool only", () => {
    const customPool = [
      { id: "custom-a", prompt: "first", acceptedInputs: ["a"] },
      { id: "custom-b", prompt: "second", acceptedInputs: ["b"] },
    ];

    const picked = selectKeymapExerciseFromPool(customPool, "custom-a");
    expect(customPool.map((item) => item.id)).toContain(picked.id);
    expect(picked.id).toBe("custom-b");
  });
});
