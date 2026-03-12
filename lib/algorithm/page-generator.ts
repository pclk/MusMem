import { scoreAndSortWords, WeakBigram } from "./scoring";

interface GeneratePageOptions {
  words: string[];
  weakBigrams: WeakBigram[];
  charsPerPage: number;
  targetedPracticeRatio?: number;
  separator?: "space" | "comma";
}

/**
 * Generate an adaptive practice page.
 *
 * - Configurable percentage of characters can come from words with highest weakness scores (targeted practice)
 * - Remaining characters come from random words (variety)
 * - Cold start (no weak bigrams): 100% random words
 */
export function generatePage(options: GeneratePageOptions): string {
  const {
    words,
    weakBigrams,
    charsPerPage,
    targetedPracticeRatio = 60,
    separator = "space",
  } = options;
  const separatorLength = separator === "comma" ? 2 : 1;

  if (words.length === 0) return "";

  // Cold start: no weak bigrams, use random words
  if (weakBigrams.length === 0) {
    return joinWords(selectRandomWords(words, charsPerPage, separatorLength), separator);
  }

  const scored = scoreAndSortWords(words, weakBigrams);
  const targetedChars = Math.floor(charsPerPage * (targetedPracticeRatio / 100));
  const varietyChars = charsPerPage - targetedChars;

  // Select targeted words (highest scores first)
  const targetedWords = selectFromScored(
    scored.filter((s) => s.score > 0),
    targetedChars,
    separatorLength
  );

  // Select variety words randomly
  const varietyWords = selectRandomWords(words, varietyChars, separatorLength);

  // Combine and shuffle
  const allWords = [...targetedWords, ...varietyWords];
  shuffleArray(allWords);

  return joinWords(allWords, separator);
}

function selectFromScored(
  scored: { word: string; score: number }[],
  targetChars: number,
  separatorLength: number
): string[] {
  const selected: string[] = [];
  let currentChars = 0;

  if (scored.length === 0 || targetChars <= 0) return selected;

  // Weighted random selection favoring higher scores
  while (currentChars < targetChars) {
    const totalScore = scored.reduce((sum, s) => sum + s.score, 0);
    let rand = Math.random() * totalScore;
    let picked = scored[0];

    for (const s of scored) {
      rand -= s.score;
      if (rand <= 0) {
        picked = s;
        break;
      }
    }

    selected.push(picked.word);
    currentChars += picked.word.length + separatorLength;
  }

  return selected;
}

function selectRandomWords(words: string[], targetChars: number, separatorLength: number): string[] {
  const selected: string[] = [];
  let currentChars = 0;

  if (targetChars <= 0) return selected;

  while (currentChars < targetChars) {
    const word = words[Math.floor(Math.random() * words.length)];
    selected.push(word);
    currentChars += word.length + separatorLength;
  }

  return selected;
}

function joinWords(words: string[], separator: "space" | "comma"): string {
  return words.join(separator === "comma" ? ", " : " ");
}

function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
