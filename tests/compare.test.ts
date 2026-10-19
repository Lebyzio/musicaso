import { describe, expect, it } from "vitest";
import { compareRatings } from "@/lib/compare";

describe("compareRatings", () => {
  it("counts shared tracks, agreement and the biggest split", () => {
    // scores: A = 8, 9, 5, skip, 7   B = 8.5, 6, 5, 9, unrated
    const res = compareRatings([16, 18, 10, "skip", 14], [17, 12, 10, 18, null]);
    expect(res).toEqual({
      both: 3,
      agree: 2,
      biggestSplit: { index: 1, a: 9, b: 6, diff: 3 },
      scoreA: (8 + 9 + 5 + 7) / 4,
      scoreB: (8.5 + 6 + 5 + 9) / 4,
    });
  });

  it("has no split when everyone agrees exactly", () => {
    expect(compareRatings([10, 12], [10, 12]).biggestSplit).toBeNull();
  });

  it("ties go to the earliest track", () => {
    expect(compareRatings([0, 20], [4, 16]).biggestSplit?.index).toBe(0);
  });

  it("handles lists of different lengths", () => {
    expect(compareRatings([10], [10, 20]).both).toBe(1);
  });
});
