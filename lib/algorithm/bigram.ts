/**
 * Extract all consecutive character pairs (bigrams) from text.
 * Includes space transitions like "e " and " t".
 */
export function extractBigrams(text: string): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < text.length - 1; i++) {
    bigrams.push(text[i] + text[i + 1]);
  }
  return bigrams;
}

/**
 * Extract bigrams from target and typed text, marking each as correct or error.
 * Compares character-by-character, so bigrams where either char was mistyped
 * are counted as errors.
 */
export function extractBigramResults(
  targetText: string,
  typedText: string
): { bigram: string; correct: boolean }[] {
  const results: { bigram: string; correct: boolean }[] = [];
  const minLen = Math.min(targetText.length, typedText.length);

  for (let i = 0; i < minLen - 1; i++) {
    const bigram = targetText[i] + targetText[i + 1];
    const char1Correct = targetText[i] === typedText[i];
    const char2Correct = targetText[i + 1] === typedText[i + 1];
    results.push({
      bigram,
      correct: char1Correct && char2Correct,
    });
  }

  // Characters beyond typedText length are considered errors
  for (let i = minLen - 1; i < targetText.length - 1; i++) {
    if (i < 0) continue;
    const bigram = targetText[i] + targetText[i + 1];
    results.push({ bigram, correct: false });
  }

  return results;
}

/**
 * Aggregate bigram results into a map of bigram -> { attempts, errors }
 */
export function aggregateBigramResults(
  results: { bigram: string; correct: boolean }[]
): Map<string, { attempts: number; errors: number }> {
  const map = new Map<string, { attempts: number; errors: number }>();

  for (const { bigram, correct } of results) {
    const existing = map.get(bigram) || { attempts: 0, errors: 0 };
    existing.attempts++;
    if (!correct) existing.errors++;
    map.set(bigram, existing);
  }

  return map;
}
