import { extractBigrams } from "./bigram";

export interface WeakBigram {
  bigram: string;
  errorRate: number;
}

/**
 * Score a word based on how many of its bigrams overlap with the user's weak bigrams.
 * Higher score = more relevant for targeted practice.
 */
export function scoreWord(
  word: string,
  weakBigramMap: Map<string, number>
): number {
  const bigrams = extractBigrams(word);
  let score = 0;
  for (const bigram of bigrams) {
    const errorRate = weakBigramMap.get(bigram);
    if (errorRate !== undefined) {
      score += errorRate;
    }
  }
  return score;
}

/**
 * Score and sort words by weakness relevance.
 * Returns words sorted by descending score.
 */
export function scoreAndSortWords(
  words: string[],
  weakBigrams: WeakBigram[]
): { word: string; score: number }[] {
  const weakMap = new Map<string, number>();
  for (const wb of weakBigrams) {
    weakMap.set(wb.bigram, wb.errorRate);
  }

  return words
    .map((word) => ({ word, score: scoreWord(word, weakMap) }))
    .sort((a, b) => b.score - a.score);
}
