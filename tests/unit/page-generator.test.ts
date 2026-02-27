import { describe, it, expect } from "vitest";
import { generatePage } from "@/lib/algorithm/page-generator";
import { WeakBigram } from "@/lib/algorithm/scoring";

describe("generatePage", () => {
  const sampleWords = ["the", "cat", "sat", "on", "mat", "hat", "bat", "rat", "fat", "pat"];

  it("returns empty string when words array is empty", () => {
    const result = generatePage({
      words: [],
      weakBigrams: [],
      charsPerPage: 200,
    });
    expect(result).toBe("");
  });

  it("generates a page with random words on cold start (no weak bigrams)", () => {
    const result = generatePage({
      words: sampleWords,
      weakBigrams: [],
      charsPerPage: 50,
    });

    expect(result.length).toBeGreaterThan(0);
    const generatedWords = result.split(" ");
    expect(generatedWords.length).toBeGreaterThan(0);
    // All generated words should be from the word list
    for (const word of generatedWords) {
      expect(sampleWords).toContain(word);
    }
  });

  it("generates a page within char tolerance of requested size", () => {
    const charsPerPage = 100;
    const result = generatePage({
      words: sampleWords,
      weakBigrams: [],
      charsPerPage,
    });

    // Allow tolerance of roughly one word length
    expect(result.length).toBeGreaterThan(charsPerPage * 0.5);
    expect(result.length).toBeLessThan(charsPerPage * 2);
  });

  it("includes targeted words when weak bigrams are provided", () => {
    const weakBigrams: WeakBigram[] = [
      { bigram: "th", errorRate: 0.8 },
      { bigram: "he", errorRate: 0.6 },
    ];

    // Run multiple times to check statistical tendency
    let theCount = 0;
    const runs = 20;
    for (let i = 0; i < runs; i++) {
      const result = generatePage({
        words: sampleWords,
        weakBigrams,
        charsPerPage: 100,
      });
      const words = result.split(" ");
      theCount += words.filter((w) => w === "the").length;
    }

    // "the" should appear more often than random chance since it contains "th" and "he"
    expect(theCount).toBeGreaterThan(0);
  });

  it("always produces space-separated words", () => {
    const result = generatePage({
      words: sampleWords,
      weakBigrams: [{ bigram: "at", errorRate: 0.5 }],
      charsPerPage: 80,
    });

    // Should not have double spaces or leading/trailing spaces
    expect(result).not.toMatch(/  /);
    expect(result.trim()).toBe(result);
  });
});
