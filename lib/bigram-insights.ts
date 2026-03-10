export const MIN_BIGRAM_ATTEMPTS = 1;
export const DEFAULT_BIGRAM_WINDOW_SIZE = 20;
export const MIN_BIGRAM_WINDOW_SIZE = 5;
export const MAX_BIGRAM_WINDOW_SIZE = 100;
export const DEFAULT_BIGRAM_INSIGHT_LIMIT = 4;

export interface BigramStatRow {
  bigram: string;
  totalAttempts: number;
  totalErrors: number;
  errorRate: number;
  lastSeen?: string | number | Date;
  recentResults?: number[];
}

export interface GuestBigramStatRow {
  attempts: number;
  errors: number;
  lastSeen: number;
  recentResults?: number[];
}

export function formatBigramLabel(bigram: string): string {
  return bigram.replace(/ /g, "\u2423").replace(/\t/g, "\\t");
}

export function getStoredRecentResults(
  recentResults: number[] | undefined,
  totalAttempts: number,
  totalErrors: number,
  maxResults = MAX_BIGRAM_WINDOW_SIZE
): number[] {
  if (recentResults && recentResults.length > 0) {
    return recentResults.slice(-maxResults);
  }

  if (totalAttempts <= 0) {
    return [];
  }

  const cappedAttempts = Math.min(totalAttempts, maxResults);
  const estimatedErrors = Math.round((totalErrors / totalAttempts) * cappedAttempts);

  return [
    ...Array.from({ length: Math.max(0, cappedAttempts - estimatedErrors) }, () => 0),
    ...Array.from({ length: Math.max(0, estimatedErrors) }, () => 1),
  ];
}

export function appendRecentBigramResults(
  recentResults: number[] | undefined,
  outcomes: boolean[],
  totalAttempts = 0,
  totalErrors = 0,
  maxResults = MAX_BIGRAM_WINDOW_SIZE
): number[] {
  const existing = getStoredRecentResults(
    recentResults,
    totalAttempts,
    totalErrors,
    maxResults
  );

  return [
    ...existing,
    ...outcomes.map((correct) => (correct ? 0 : 1)),
  ].slice(-maxResults);
}

export function calculateRollingErrorRate(
  recentResults: number[] | undefined,
  windowSize: number,
  totalAttempts = 0,
  totalErrors = 0
): number {
  const results = getStoredRecentResults(
    recentResults,
    totalAttempts,
    totalErrors
  ).slice(-windowSize);

  if (results.length === 0) {
    return 0;
  }

  return results.reduce((sum, result) => sum + result, 0) / results.length;
}

export function materializeBigramStats(
  stats: Array<{
    bigram: string;
    totalAttempts: number;
    totalErrors: number;
    lastSeen?: string | number | Date;
    recentResults?: number[];
  }>,
  windowSize: number
): BigramStatRow[] {
  return stats
    .map((stat) => {
      const recentResults = getStoredRecentResults(
        stat.recentResults,
        stat.totalAttempts,
        stat.totalErrors
      );

      return {
        ...stat,
        recentResults,
        errorRate: calculateRollingErrorRate(
          recentResults,
          windowSize,
          stat.totalAttempts,
          stat.totalErrors
        ),
      };
    })
    .sort(compareWeakBigrams);
}

export function normalizeGuestBigramStats(
  stats: Record<string, GuestBigramStatRow>,
  windowSize: number
): BigramStatRow[] {
  return materializeBigramStats(
    Object.entries(stats).map(([bigram, stat]) => ({
      bigram,
      totalAttempts: stat.attempts,
      totalErrors: stat.errors,
      lastSeen: stat.lastSeen,
      recentResults: stat.recentResults,
    })),
    windowSize
  );
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
