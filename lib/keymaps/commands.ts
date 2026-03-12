const MODIFIER_ORDER = ["Ctrl", "Alt", "Shift", "Super"] as const;

const MODIFIER_ALIASES = new Map<string, (typeof MODIFIER_ORDER)[number]>([
  ["ctrl", "Ctrl"],
  ["control", "Ctrl"],
  ["alt", "Alt"],
  ["option", "Alt"],
  ["shift", "Shift"],
  ["super", "Super"],
  ["cmd", "Super"],
  ["command", "Super"],
  ["meta", "Super"],
  ["win", "Super"],
  ["windows", "Super"],
]);

const KEY_ALIASES = new Map<string, string>([
  ["space", "Space"],
  ["spacebar", "Space"],
  ["enter", "Enter"],
  ["return", "Enter"],
  ["esc", "Escape"],
  ["escape", "Escape"],
  ["tab", "Tab"],
  ["backspace", "Backspace"],
  ["delete", "Delete"],
  ["del", "Delete"],
  ["home", "Home"],
  ["end", "End"],
  ["pageup", "PageUp"],
  ["page-up", "PageUp"],
  ["pagedown", "PageDown"],
  ["page-down", "PageDown"],
  ["arrowup", "ArrowUp"],
  ["arrow-up", "ArrowUp"],
  ["up", "ArrowUp"],
  ["arrowdown", "ArrowDown"],
  ["arrow-down", "ArrowDown"],
  ["down", "ArrowDown"],
  ["arrowleft", "ArrowLeft"],
  ["arrow-left", "ArrowLeft"],
  ["left", "ArrowLeft"],
  ["arrowright", "ArrowRight"],
  ["arrow-right", "ArrowRight"],
  ["right", "ArrowRight"],
]);

function normalizeBaseKeyToken(value: string, options?: { preserveSingleCharacterCase?: boolean }): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Command key is required");
  }

  const alias = KEY_ALIASES.get(trimmed.toLowerCase());
  if (alias) {
    return alias;
  }

  if (trimmed.length === 1) {
    return options?.preserveSingleCharacterCase ? trimmed : trimmed.toLowerCase();
  }

  if (/^f([1-9]|1[0-2])$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  if (/^[a-z0-9._/\-`]+$/i.test(trimmed)) {
    return trimmed;
  }

  throw new Error(`Unsupported key token "${trimmed}"`);
}

export function normalizeConfiguredKeymapCommand(command: string): string {
  const tokens = command
    .split("+")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    throw new Error("Command is required");
  }

  const normalizedModifiers = new Set<(typeof MODIFIER_ORDER)[number]>();
  let baseKey: string | null = null;

  for (const token of tokens) {
    const modifier = MODIFIER_ALIASES.get(token.toLowerCase());
    if (modifier) {
      if (baseKey) {
        throw new Error(`Modifier "${modifier}" must come before the key`);
      }
      normalizedModifiers.add(modifier);
      continue;
    }

    if (baseKey) {
      throw new Error("Only one non-modifier key is allowed per command");
    }

    baseKey = normalizeBaseKeyToken(token, { preserveSingleCharacterCase: true });
  }

  if (!baseKey) {
    throw new Error("Command key is required");
  }

  if (
    normalizedModifiers.size === 1 &&
    normalizedModifiers.has("Shift") &&
    /^[a-z]$/i.test(baseKey)
  ) {
    return baseKey.toUpperCase();
  }

  const modifiers = MODIFIER_ORDER.filter((modifier) => normalizedModifiers.has(modifier));
  return [...modifiers, baseKey].join("+");
}

function normalizeEventKey(key: string): string | null {
  if (MODIFIER_ALIASES.has(key.toLowerCase())) {
    return null;
  }

  if (key === " ") {
    return "Space";
  }

  return normalizeBaseKeyToken(key);
}

export function getActiveModifiersFromEvent(event: {
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): string[] {
  return MODIFIER_ORDER.filter((modifier) => {
    switch (modifier) {
      case "Ctrl":
        return event.ctrlKey;
      case "Alt":
        return event.altKey;
      case "Shift":
        return event.shiftKey;
      case "Super":
        return event.metaKey;
      default:
        return false;
    }
  });
}

export function formatKeymapCommandFromEvent(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): string | null {
  const onlyShiftModifier =
    event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;

  if (onlyShiftModifier && event.key.length === 1 && /^[A-Z]$/.test(event.key)) {
    return event.key;
  }

  const baseKey = normalizeEventKey(event.key);
  if (!baseKey) {
    return null;
  }

  const modifiers = getActiveModifiersFromEvent(event);

  return [...modifiers, baseKey].join("+");
}
