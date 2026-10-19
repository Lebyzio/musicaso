import { describe, expect, it } from "vitest";
import type { Rating } from "@/lib/score";
import { decodeRatings, encodeRatings, fitRatings } from "@/lib/share/ratings";

describe("rating encoding", () => {
  it("uses one character per track", () => {
    expect(encodeRatings([20, 15, 0, "skip", null, 9])).toBe("kf0_.9");
  });

  it("round-trips every possible value", () => {
    const all: Rating[] = [...Array.from({ length: 21 }, (_, i) => i), "skip", null];
    expect(decodeRatings(encodeRatings(all))).toEqual(all);
  });

  it("round-trips an empty list", () => {
    expect(decodeRatings(encodeRatings([]))).toEqual([]);
  });

  it.each(["l", "z", "K", " ", "1-2"])("rejects %j", (bad) => {
    expect(decodeRatings(bad)).toBeNull();
  });

  it("refuses to encode out-of-range values", () => {
    expect(() => encodeRatings([21])).toThrow(RangeError);
    expect(() => encodeRatings([7.5])).toThrow(RangeError);
  });

  it("fits ratings to the tracklist length", () => {
    expect(fitRatings([1, 2], 4)).toEqual([1, 2, null, null]);
    expect(fitRatings([1, 2, 3], 2)).toEqual([1, 2]);
  });
});
