import { describe, it, expect } from "vitest";
import { scoreWord, scoreAndSortWords, WeakBigram } from "@/lib/algorithm/scoring";

describe("scoreWord", () => {
  it("returns sum of error rates for matching bigrams", () => {
    const weakMap = new Map([
      ["th", 0.5],
      ["he", 0.3],
    ]);
    // "the" has bigrams: "th", "he" → 0.5 + 0.3 = 0.8
    expect(scoreWord("the", weakMap)).toBeCloseTo(0.8);
  });

  it("returns 0 when no bigrams match", () => {
    const weakMap = new Map([["zz", 0.5]]);
    expect(scoreWord("hello", weakMap)).toBe(0);
  });

  it("returns 0 for single-character words", () => {
    const weakMap = new Map([["ab", 0.5]]);
    expect(scoreWord("a", weakMap)).toBe(0);
  });

  it("handles repeated bigrams in a word", () => {
    const weakMap = new Map([["ll", 0.4]]);
    // "lll" has bigrams: "ll", "ll" → 0.4 + 0.4 = 0.8
    expect(scoreWord("lll", weakMap)).toBeCloseTo(0.8);
  });
});

describe("scoreAndSortWords", () => {
  it("sorts words by descending score", () => {
    const weakBigrams: WeakBigram[] = [
      { bigram: "th", errorRate: 0.5 },
      { bigram: "he", errorRate: 0.3 },
    ];
    const words = ["cat", "the", "then"];
    const sorted = scoreAndSortWords(words, weakBigrams);

    // "the" → th(0.5) + he(0.3) = 0.8
    // "then" → th(0.5) + he(0.3) = 0.8 (en not in weak)
    // "cat" → no matching bigrams = 0
    expect(sorted[0].word).toBe("the");
    expect(sorted[1].word).toBe("then");
    expect(sorted[2].word).toBe("cat");
    expect(sorted[2].score).toBe(0);
  });

  it("returns all words with score 0 when no weak bigrams", () => {
    const sorted = scoreAndSortWords(["hello", "world"], []);
    expect(sorted.every((s) => s.score === 0)).toBe(true);
  });
});
