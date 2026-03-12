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
 * Calculate how many completed items occur per minute.
 */
export function calculateItemsPerMinute(
  itemCount: number,
  durationMs: number
): number {
  if (durationMs <= 0 || itemCount <= 0) return 0;
  const minutes = durationMs / 60000;
  return Math.round((itemCount / minutes) * 10) / 10;
}

export interface RollingKeymapAttempt {
  correct: boolean;
  latencyMs: number;
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

/**
 * Calculate rolling keymap drill metrics over the most recent attempts.
 */
export function calculateRollingKeymapStats(
  attempts: RollingKeymapAttempt[],
  windowSize: number
): { accuracy: number | null; kpm: number | null } {
  const recentAttempts = attempts.slice(-windowSize);
  if (!recentAttempts.length) {
    return { accuracy: null, kpm: null };
  }

  const correctAttempts = recentAttempts.filter((attempt) => attempt.correct).length;
  const totalDurationMs = recentAttempts.reduce((sum, attempt) => sum + attempt.latencyMs, 0);

  return {
    accuracy: calculateAccuracy(correctAttempts, recentAttempts.length),
    kpm: calculateItemsPerMinute(recentAttempts.length, totalDurationMs),
  };
}
