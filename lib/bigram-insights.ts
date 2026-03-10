export const MIN_BIGRAM_ATTEMPTS = 1;
export const DEFAULT_BIGRAM_INSIGHT_LIMIT = 4;

export interface BigramStatRow {
  bigram: string;
  totalAttempts: number;
  totalErrors: number;
  errorRate: number;
  lastSeen?: string | number | Date;
}

export interface GuestBigramStatRow {
  attempts: number;
  errors: number;
  lastSeen: number;
}

export function formatBigramLabel(bigram: string): string {
  return bigram.replace(/ /g, "\u2423").replace(/\t/g, "\\t");
}

export function normalizeGuestBigramStats(
  stats: Record<string, GuestBigramStatRow>
): BigramStatRow[] {
  return Object.entries(stats).map(([bigram, stat]) => ({
    bigram,
    totalAttempts: stat.attempts,
    totalErrors: stat.errors,
    errorRate: stat.attempts > 0 ? stat.errors / stat.attempts : 0,
    lastSeen: stat.lastSeen,
  }));
}

function compareWeakBigrams(a: BigramStatRow, b: BigramStatRow): number {
  if (b.errorRate !== a.errorRate) {
    return b.errorRate - a.errorRate;
  }

  if (b.totalAttempts !== a.totalAttempts) {
    return b.totalAttempts - a.totalAttempts;
  }

  return a.bigram.localeCompare(b.bigram);
}

function compareStrongBigrams(a: BigramStatRow, b: BigramStatRow): number {
  if (a.errorRate !== b.errorRate) {
    return a.errorRate - b.errorRate;
  }

  if (b.totalAttempts !== a.totalAttempts) {
    return b.totalAttempts - a.totalAttempts;
  }

  return a.bigram.localeCompare(b.bigram);
}

export function getBigramInsights(
  stats: BigramStatRow[],
  options?: { minAttempts?: number; limit?: number }
) {
  const minAttempts = options?.minAttempts ?? MIN_BIGRAM_ATTEMPTS;
  const limit = options?.limit ?? DEFAULT_BIGRAM_INSIGHT_LIMIT;
  const qualified = stats.filter((stat) => stat.totalAttempts >= minAttempts);

  const weak = [...qualified].sort(compareWeakBigrams).slice(0, limit);
  const weakSet = new Set(weak.map((stat) => stat.bigram));
  const strongRanked = [...qualified].sort(compareStrongBigrams);
  const strong = [
    ...strongRanked.filter((stat) => !weakSet.has(stat.bigram)),
    ...strongRanked.filter((stat) => weakSet.has(stat.bigram)),
  ].slice(0, limit);

  return {
    qualifiedCount: qualified.length,
    weak,
    strong,
  };
}
