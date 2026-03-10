import { describe, expect, it } from "vitest";
import {
  appendRecentBigramResults,
  formatBigramLabel,
  getBigramInsights,
  normalizeGuestBigramStats,
} from "@/lib/bigram-insights";

describe("formatBigramLabel", () => {
  it("makes spaces visible", () => {
    expect(formatBigramLabel("a ")).toBe("a\u2423");
  });

  it("shows tab escapes", () => {
    expect(formatBigramLabel("\ta")).toBe("\\ta");
  });
});

describe("normalizeGuestBigramStats", () => {
  it("converts guest storage shape to ranked stats", () => {
    expect(
      normalizeGuestBigramStats({
        th: { attempts: 10, errors: 3, lastSeen: 123 },
      }, 20)
    ).toEqual([
      {
        bigram: "th",
        totalAttempts: 10,
        totalErrors: 3,
        errorRate: 0.3,
        lastSeen: 123,
        recentResults: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
      },
    ]);
  });
});

describe("appendRecentBigramResults", () => {
  it("caps stored outcomes and appends latest attempts in order", () => {
    expect(
      appendRecentBigramResults([0, 1], [true, false, false], 2, 1, 4)
    ).toEqual([1, 0, 1, 1]);
  });
});

describe("getBigramInsights", () => {
  it("returns weak and strong rankings from qualified bigrams", () => {
    const insights = getBigramInsights([
      { bigram: "th", totalAttempts: 12, totalErrors: 6, errorRate: 0.5 },
      { bigram: "he", totalAttempts: 15, totalErrors: 0, errorRate: 0 },
      { bigram: "er", totalAttempts: 8, totalErrors: 1, errorRate: 0.125 },
      { bigram: "re", totalAttempts: 3, totalErrors: 3, errorRate: 1 },
    ], { minAttempts: 5 });

    expect(insights.qualifiedCount).toBe(3);
    expect(insights.weak.map((entry) => entry.bigram)).toEqual(["th", "er", "he"]);
    expect(insights.strong.map((entry) => entry.bigram)).toEqual(["he", "er", "th"]);
  });

  it("prefers non-overlapping strong bigrams when enough data exists", () => {
    const insights = getBigramInsights(
      [
        { bigram: "th", totalAttempts: 10, totalErrors: 6, errorRate: 0.6 },
        { bigram: "he", totalAttempts: 10, totalErrors: 5, errorRate: 0.5 },
        { bigram: "in", totalAttempts: 10, totalErrors: 0, errorRate: 0 },
        { bigram: "er", totalAttempts: 10, totalErrors: 1, errorRate: 0.1 },
      ],
      { limit: 2 }
    );

    expect(insights.weak.map((entry) => entry.bigram)).toEqual(["th", "he"]);
    expect(insights.strong.map((entry) => entry.bigram)).toEqual(["in", "er"]);
  });
});
