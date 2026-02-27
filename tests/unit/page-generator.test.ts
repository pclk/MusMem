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

    expect(result.length).toBeGreaterThan(charsPerPage * 0.5);
    expect(result.length).toBeLessThan(charsPerPage * 2);
  });

  it("always produces space-separated words", () => {
    const result = generatePage({
      words: sampleWords,
      weakBigrams: [{ bigram: "at", errorRate: 0.5 }],
      charsPerPage: 80,
    });

    expect(result).not.toMatch(/  /);
    expect(result.trim()).toBe(result);
  });

  it("uses ratio 0 to favor variety words", () => {
    const words = ["the", "alpha", "bravo", "charlie", "delta"];
    const weakBigrams: WeakBigram[] = [
      { bigram: "th", errorRate: 1 },
      { bigram: "he", errorRate: 1 },
    ];

    const result = generatePage({
      words,
      weakBigrams,
      charsPerPage: 100,
      targetedPracticeRatio: 0,
    });

    const generatedWords = result.split(" ");
    const theCount = generatedWords.filter((w) => w === "the").length;
    expect(theCount).toBeLessThan(generatedWords.length * 0.8);
  });

  it("uses ratio 100 to maximize targeted words", () => {
    const words = ["the", "alpha", "bravo", "charlie", "delta"];
    const weakBigrams: WeakBigram[] = [
      { bigram: "th", errorRate: 1 },
      { bigram: "he", errorRate: 1 },
    ];

    const result = generatePage({
      words,
      weakBigrams,
      charsPerPage: 100,
      targetedPracticeRatio: 100,
    });

    const generatedWords = result.split(" ");
    const allTargeted = generatedWords.every((word) => word === "the");
    expect(allTargeted).toBe(true);
  });

  it("uses ratio 60 to mix targeted and variety words", () => {
    const words = ["the", "alpha", "bravo", "charlie", "delta"];
    const weakBigrams: WeakBigram[] = [
      { bigram: "th", errorRate: 1 },
      { bigram: "he", errorRate: 1 },
    ];

    const result = generatePage({
      words,
      weakBigrams,
      charsPerPage: 100,
      targetedPracticeRatio: 60,
    });

    const generatedWords = result.split(" ");
    const targetedCount = generatedWords.filter((word) => word === "the").length;

    expect(targetedCount).toBeGreaterThan(0);
    expect(targetedCount).toBeLessThan(generatedWords.length);
  });
});
