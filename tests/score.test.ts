import { describe, expect, it } from "vitest";
import {
  albumScore,
  albumStats,
  clampHalfSteps,
  formatScore,
  type Rating,
  roundScore,
  verdict,
} from "@/lib/score";

describe("albumScore", () => {
  it("averages scored tracks, ignoring skipped and unrated ones", () => {
    // 8.0, 7.5, skip, unrated, 9.0
    const ratings: Rating[] = [16, 15, "skip", null, 18];
    expect(albumScore(ratings)).toBeCloseTo((8 + 7.5 + 9) / 3);
  });

  it("returns null when nothing is scored", () => {
    expect(albumScore([])).toBeNull();
    expect(albumScore([null, "skip"])).toBeNull();
  });

  it("counts a 0 as a real score", () => {
    expect(albumScore([0, 20])).toBe(5);
  });

  it("weights by track length", () => {
    // 10.0 for a 60s track, 5.0 for a 240s track -> (600 + 1200) / 300 = 6
    expect(albumScore([20, 10], [60, 240])).toBe(6);
  });

  it("treats missing or zero weights as 1 and ignores weights of skipped tracks", () => {
    expect(albumScore([20, 10, "skip"], [0, 1, 1000])).toBe(7.5);
  });
});

describe("rounding and formatting", () => {
  it("rounds half up to one decimal", () => {
    expect(roundScore(8.25)).toBe(8.3);
    expect(roundScore(8.24)).toBe(8.2);
    expect(roundScore((8 + 7.5 + 9) / 3)).toBe(8.2);
  });

  it("formats with one decimal or a dash", () => {
    expect(formatScore(10)).toBe("10.0");
    expect(formatScore(7)).toBe("7.0");
    expect(formatScore(null)).toBe("–");
  });

  it("clamps half-steps to 0–20", () => {
    expect(clampHalfSteps(-1)).toBe(0);
    expect(clampHalfSteps(21)).toBe(20);
    expect(clampHalfSteps(7.6)).toBe(8);
  });
});

describe("verdict", () => {
  it.each([
    [10, "Masterpiece"],
    [9, "Masterpiece"],
    [8.95, "Masterpiece"], // displays as 9.0
    [8.94, "Great"],
    [8, "Great"],
    [7.9, "Good"],
    [6.5, "Good"],
    [6.4, "Mixed"],
    [5, "Mixed"],
    [4.9, "Skip"],
    [0, "Skip"],
  ] as const)("%s → %s", (score, label) => {
    expect(verdict(score)).toBe(label);
  });

  it("has no verdict without a score", () => {
    expect(verdict(null)).toBeNull();
  });
});

describe("albumStats", () => {
  it("summarises counts, highs and lows (ties go to the earliest track)", () => {
    const stats = albumStats([16, 18, "skip", null, 18, 6]);
    expect(stats).toMatchObject({
      total: 6,
      scored: 4,
      skipped: 1,
      unrated: 1,
      highest: { index: 1, score: 9 },
      lowest: { index: 5, score: 3 },
      atLeast8: 3,
    });
  });

  it("needs three scored tracks before judging consistency", () => {
    expect(albumStats([16, 16]).consistency).toBeNull();
    expect(albumStats([16, 16, 16]).consistency).toBe("Rock solid");
  });

  it("labels spread by standard deviation", () => {
    expect(albumStats([16, 17, 15]).consistency).toBe("Rock solid"); // SD ≈ 0.41
    expect(albumStats([12, 16, 18]).consistency).toBe("Consistent"); // SD ≈ 1.25
    expect(albumStats([8, 14, 18]).consistency).toBe("Uneven"); // SD ≈ 2.05
    expect(albumStats([0, 10, 20]).consistency).toBe("All over the place"); // SD ≈ 4.08
  });

  it("handles an empty album", () => {
    expect(albumStats([])).toMatchObject({ total: 0, highest: null, lowest: null, stdDev: null });
  });
});
