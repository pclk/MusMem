/**
 * Calculate words per minute from character count and duration in milliseconds.
 */
export function calculateWpm(charCount: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  const minutes = durationMs / 60000;
  const wordCount = charCount / 5; // standard: 1 word = 5 chars
  return Math.round(wordCount / minutes);
}

/**
 * Calculate accuracy as a percentage.
 */
export function calculateAccuracy(
  correctChars: number,
  totalChars: number
): number {
  if (totalChars <= 0) return 100;
  return Math.round((correctChars / totalChars) * 10000) / 100;
}

/**
 * Format a number as a percentage string.
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
