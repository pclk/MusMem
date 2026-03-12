export function parseWordListText(wordsText: string): string[] {
  const normalized = wordsText.trim();
  if (!normalized) {
    return [];
  }

  if (normalized.includes(",") || normalized.includes("\n")) {
    return normalized
      .split(/[,\n]+/)
      .map((word) => word.trim().toLowerCase())
      .filter((word) => word.length > 0);
  }

  return normalized
    .split(/\s+/)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length > 0);
}

export function serializeWordListText(words: string[]): string {
  return words.join(", ");
}
