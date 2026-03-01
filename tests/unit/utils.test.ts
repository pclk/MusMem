import { describe, it, expect } from "vitest";
import { calculateWpm, calculateAccuracy, formatPercent } from "@/lib/utils";

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

describe("calculateAccuracy", () => {
  it("returns 100 when there are no typed characters", () => {
    expect(calculateAccuracy(0, 0)).toBe(100);
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
