import { describe, it, expect } from "vitest";
import {
  calculateWpm,
  calculateItemsPerMinute,
  calculateAccuracy,
  calculateRollingKeymapStats,
  formatPercent,
} from "@/lib/utils";

describe("calculateWpm", () => {
  it("returns 0 when duration is 0 or negative", () => {
    expect(calculateWpm(100, 0)).toBe(0);
    expect(calculateWpm(100, -500)).toBe(0);
  });

  it("calculates and rounds WPM using 5 chars per word", () => {
    expect(calculateWpm(250, 60000)).toBe(50);
    expect(calculateWpm(333, 60000)).toBe(67);
  });
});

describe("calculateItemsPerMinute", () => {
  it("returns 0 when duration is 0 or negative", () => {
    expect(calculateItemsPerMinute(1, 0)).toBe(0);
    expect(calculateItemsPerMinute(1, -500)).toBe(0);
  });

  it("calculates and rounds items per minute to one decimal place", () => {
    expect(calculateItemsPerMinute(1, 15000)).toBe(4);
    expect(calculateItemsPerMinute(3, 40000)).toBe(4.5);
  });
});

describe("calculateAccuracy", () => {
  it("returns 100 when there are no typed characters", () => {
    expect(calculateAccuracy(0, 0)).toBe(100);
  });

  it("penalizes corrected mistakes when attempts exceed final correct chars", () => {
    expect(calculateAccuracy(5, 6)).toBe(83.33);
  });

  it("returns percentage rounded to 2 decimals", () => {
    expect(calculateAccuracy(19, 23)).toBe(82.61);
    expect(calculateAccuracy(1, 3)).toBe(33.33);
  });
});

describe("formatPercent", () => {
  it("formats values with one decimal place and a percent suffix", () => {
    expect(formatPercent(82.61)).toBe("82.6%");
    expect(formatPercent(100)).toBe("100.0%");
  });
});

describe("calculateRollingKeymapStats", () => {
  it("returns null metrics when there are no attempts", () => {
    expect(calculateRollingKeymapStats([], 10)).toEqual({
      accuracy: null,
      kpm: null,
    });
  });

  it("calculates rolling accuracy and kpm from the most recent attempts", () => {
    const attempts = [
      { correct: true, latencyMs: 2000 },
      { correct: false, latencyMs: 3000 },
      { correct: true, latencyMs: 5000 },
    ];

    expect(calculateRollingKeymapStats(attempts, 10)).toEqual({
      accuracy: 66.67,
      kpm: 18,
    });
  });

  it("caps the rolling window to the requested attempt count", () => {
    const attempts = Array.from({ length: 12 }, (_, index) => ({
      correct: index >= 2,
      latencyMs: 6000,
    }));

    expect(calculateRollingKeymapStats(attempts, 10)).toEqual({
      accuracy: 100,
      kpm: 10,
    });
  });
});
