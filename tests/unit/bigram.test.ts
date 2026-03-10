import { describe, it, expect } from "vitest";
import {
  extractBigrams,
  extractBigramResults,
  aggregateBigramResults,
  groupBigramResults,
} from "@/lib/algorithm/bigram";

describe("extractBigrams", () => {
  it("extracts consecutive character pairs from text", () => {
    expect(extractBigrams("hello")).toEqual(["he", "el", "ll", "lo"]);
  });

  it("includes space transitions", () => {
    expect(extractBigrams("a b")).toEqual(["a ", " b"]);
  });

  it("returns empty array for single character", () => {
    expect(extractBigrams("a")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(extractBigrams("")).toEqual([]);
  });

  it("handles longer text with spaces", () => {
    const bigrams = extractBigrams("the cat");
    expect(bigrams).toEqual(["th", "he", "e ", " c", "ca", "at"]);
  });
});

describe("extractBigramResults", () => {
  it("marks all bigrams correct when typing matches", () => {
    const results = extractBigramResults("hello", "hello");
    expect(results).toHaveLength(4);
    expect(results.every((r) => r.correct)).toBe(true);
  });

  it("marks bigrams as errors when characters differ", () => {
    const results = extractBigramResults("hello", "hxllo");
    // "he" → h correct, e→x incorrect → error
    // "el" → e→x incorrect → error
    // "ll" → both correct
    // "lo" → both correct
    expect(results[0]).toEqual({ bigram: "he", correct: false });
    expect(results[1]).toEqual({ bigram: "el", correct: false });
    expect(results[2]).toEqual({ bigram: "ll", correct: true });
    expect(results[3]).toEqual({ bigram: "lo", correct: true });
  });

  it("handles shorter typed text (missing chars are errors)", () => {
    const results = extractBigramResults("hello", "hel");
    // First 2 bigrams from matched portion
    expect(results[0]).toEqual({ bigram: "he", correct: true });
    expect(results[1]).toEqual({ bigram: "el", correct: true });
    // Remaining bigrams are errors
    expect(results[2]).toEqual({ bigram: "ll", correct: false });
    expect(results[3]).toEqual({ bigram: "lo", correct: false });
  });

  it("handles empty typed text", () => {
    const results = extractBigramResults("hi", "");
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ bigram: "hi", correct: false });
  });
});

describe("aggregateBigramResults", () => {
  it("aggregates attempts and errors for duplicate bigrams", () => {
    const results = [
      { bigram: "th", correct: true },
      { bigram: "th", correct: false },
      { bigram: "th", correct: true },
      { bigram: "he", correct: true },
    ];
    const aggregated = aggregateBigramResults(results);

    expect(aggregated.get("th")).toEqual({ attempts: 3, errors: 1 });
    expect(aggregated.get("he")).toEqual({ attempts: 1, errors: 0 });
  });

  it("returns empty map for empty input", () => {
    const aggregated = aggregateBigramResults([]);
    expect(aggregated.size).toBe(0);
  });
});

describe("groupBigramResults", () => {
  it("preserves ordered outcomes for each repeated bigram", () => {
    const grouped = groupBigramResults([
      { bigram: "th", correct: true },
      { bigram: "he", correct: false },
      { bigram: "th", correct: false },
    ]);

    expect(grouped.get("th")).toEqual([true, false]);
    expect(grouped.get("he")).toEqual([false]);
  });
});
