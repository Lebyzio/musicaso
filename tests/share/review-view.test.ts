import { describe, expect, it } from "vitest";
import type { Album } from "@/lib/music/types";
import { reviewView } from "@/lib/share/review-view";
import type { ReviewPayload } from "@/lib/share/schema";

const album: Album = {
  source: "dz",
  id: "1",
  title: "Test",
  artist: "Band",
  coverUrl: "",
  coverThumbUrl: "",
  tracks: [60, 240, 120].map((durationSec, i) => ({
    id: String(i),
    position: i + 1,
    disc: 1,
    title: `T${i + 1}`,
    durationSec,
  })),
};

const base: ReviewPayload = { v: 1, s: "dz", a: "1", k: 3, r: "ka_" };

describe("reviewView", () => {
  it("derives score, verdict, stats and the favourite", () => {
    const view = reviewView(album, { ...base, n: "Alex", t: "Nice" });
    expect(view).toMatchObject({
      score: 7.5,
      verdict: "Good",
      favorite: 0, // highest-scored by default
      mismatch: false,
      name: "Alex",
      text: "Nice",
      reference: null,
      comparison: null,
    });
    expect(view.stats).toMatchObject({ scored: 2, skipped: 1 });
  });

  it("honours an explicit favourite and length weighting", () => {
    const view = reviewView(album, { ...base, f: 1, w: 1 });
    expect(view.favorite).toBe(1);
    expect(view.score).toBe((10 * 60 + 5 * 240) / 300);
  });

  it("ignores an out-of-range favourite", () => {
    expect(reviewView(album, { ...base, f: 9 }).favorite).toBe(0);
  });

  it("matches ratings by position when the tracklist changed", () => {
    const view = reviewView(album, { ...base, k: 5, r: "kkkkk" });
    expect(view.mismatch).toBe(true);
    expect(view.ratings).toEqual([20, 20, 20]);
  });

  it("builds the comparison with a reference review", () => {
    const view = reviewView(album, { ...base, ref: { n: "Sam", r: "gg" } });
    expect(view.reference).toEqual({ name: "Sam", ratings: [16, 16, null] });
    expect(view.comparison).toMatchObject({ both: 2, agree: 0 });
  });
});
