import { describe, expect, it } from "vitest";
import {
  formatKeymapCommandFromEvent,
  getActiveModifiersFromEvent,
  normalizeConfiguredKeymapCommand,
} from "@/lib/keymaps/commands";

describe("normalizeConfiguredKeymapCommand", () => {
  it("normalizes modifier aliases and ordering", () => {
    expect(normalizeConfiguredKeymapCommand("command + shift + p")).toBe("Shift+Super+p");
    expect(normalizeConfiguredKeymapCommand("control+k")).toBe("Ctrl+k");
  });

  it("accepts plain text commands", () => {
    expect(normalizeConfiguredKeymapCommand("ciw")).toBe("ciw");
    expect(normalizeConfiguredKeymapCommand("Shift+g")).toBe("G");
    expect(normalizeConfiguredKeymapCommand("G")).toBe("G");
  });

  it("rejects commands without a non-modifier key", () => {
    expect(() => normalizeConfiguredKeymapCommand("Ctrl+Shift")).toThrow("Command key is required");
  });
});

describe("formatKeymapCommandFromEvent", () => {
  it("reports the currently held modifiers in display order", () => {
    expect(
      getActiveModifiersFromEvent({
        ctrlKey: true,
        metaKey: true,
        altKey: false,
        shiftKey: true,
      })
    ).toEqual(["Ctrl", "Shift", "Super"]);
  });

  it("ignores modifier-only key presses", () => {
    expect(
      formatKeymapCommandFromEvent({
        key: "Control",
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: false,
      })
    ).toBeNull();
  });

  it("formats modified keyboard events", () => {
    expect(
      formatKeymapCommandFromEvent({
        key: "P",
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: true,
      })
    ).toBe("Ctrl+Shift+p");
  });

  it("formats special keys", () => {
    expect(
      formatKeymapCommandFromEvent({
        key: "Enter",
        ctrlKey: false,
        metaKey: true,
        altKey: false,
        shiftKey: false,
      })
    ).toBe("Super+Enter");
  });
});
