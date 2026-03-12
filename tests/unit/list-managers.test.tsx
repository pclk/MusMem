import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WordListManager from "@/app/settings/components/WordListManager";
import KeymapListManager from "@/app/settings/components/KeymapListManager";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("WordListManager", () => {
  it("renders the built-in default word list as a read-only section", () => {
    render(
      <WordListManager
        wordLists={[]}
        projectWordLists={[]}
        defaultList={{
          name: "Default English (5k words)",
          words: ["alpha", "beta", "gamma"],
        }}
      />
    );

    expect(screen.getByText("Default English (5k words)")).toBeTruthy();
    expect(screen.getByText("Built-in list · 3 words · read-only")).toBeTruthy();
    expect(
      (screen.getByRole("textbox", { name: "Default English (5k words) words" }) as HTMLTextAreaElement)
        .value
    ).toBe("alpha, beta, gamma");
  });
});

describe("KeymapListManager", () => {
  it("renders the built-in default keymap drills as a read-only section", () => {
    render(
      <KeymapListManager
        keymapLists={[]}
        projectKeymapLists={[]}
        defaultList={{
          name: "Default keymap drills",
          exercises: [
            {
              prompt: "change inside word",
              acceptedInputs: ["ciw"],
            },
          ],
        }}
      />
    );

    expect(screen.getByText("Default keymap drills")).toBeTruthy();
    expect(screen.getByText("Built-in list · 1 exercise · read-only")).toBeTruthy();
    expect(
      (screen.getByRole("textbox", { name: "Default keymap drills exercises" }) as HTMLTextAreaElement)
        .value
    ).toBe("change inside word => ciw");
  });
});
