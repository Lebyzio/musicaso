import { describe, expect, it } from "vitest";
import { cardTracks, STORY_HIGHLIGHTS } from "@/lib/card/tracks";
import { CARD_THEMES, cardPalette, isCardTheme } from "@/lib/card/themes";
import { contrastRatio, fromHex } from "@/lib/color";
import type { Track } from "@/lib/music/types";
import type { Rating } from "@/lib/score";

const tracks = (n: number): Track[] =>
  Array.from({ length: n }, (_, i) => ({
    id: String(i),
    position: i + 1,
    disc: 1,
    title: `T${i + 1}`,
    durationSec: 200,
  }));

describe("cardPalette", () => {
  // A spread of real-world accents: dark, mid, light, saturated, greyish.
  const accents = [
    "#ce5a2f",
    "#f2b34b",
    "#1e3a8a",
    "#7fcf8c",
    "#ffffff",
    "#000000",
    "#8b5cf6",
    "#9a9387",
  ];

  it.each(CARD_THEMES)("keeps all %s text readable (≥ 4.5:1)", (theme) => {
    for (const accent of accents) {
      const p = cardPalette(theme, accent);
      for (const key of ["fg", "dim", "mute", "score"] as const) {
        expect(
          contrastRatio(fromHex(p[key]), fromHex(p.bg)),
          `${theme} ${accent} ${key}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("only the sleeve theme glows", () => {
    expect(cardPalette("sleeve", "#ce5a2f").glow).not.toBeNull();
    expect(cardPalette("paper", "#ce5a2f").glow).toBeNull();
  });

  it("uses the accent as the vivid background", () => {
    expect(cardPalette("vivid", "#8b5cf6").bg).toBe("#8b5cf6");
  });

  it("validates theme ids", () => {
    expect(isCardTheme("paper")).toBe(true);
    expect(isCardTheme("neon")).toBe(false);
    expect(isCardTheme(undefined)).toBe(false);
  });
});

describe("cardTracks", () => {
  it("square shows the top three, ties by album order", () => {
    const ratings: Rating[] = [10, 18, "skip", 18, null, 20];
    const { items, highlights } = cardTracks(tracks(6), ratings, "square");
    expect(items.map((t) => t.index)).toEqual([5, 1, 3]);
    expect(highlights).toBe(true);
  });

  it("story shows a short album in full", () => {
    const { items, highlights } = cardTracks(tracks(10), [], "story");
    expect(items).toHaveLength(10);
    expect(highlights).toBe(false);
  });

  it("story picks highlights from long albums, back in album order", () => {
    const ratings = Array.from({ length: 65 }, (_, i) => (i * 5) % 21);
    const { items, highlights } = cardTracks(tracks(65), ratings, "story");
    expect(highlights).toBe(true);
    expect(items).toHaveLength(STORY_HIGHLIGHTS);
    const idx = items.map((t) => t.index);
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
    expect(Math.min(...items.map((t) => t.rating as number))).toBeGreaterThanOrEqual(16);
  });

  it("carries reference ratings for comparison cards", () => {
    const { items } = cardTracks(tracks(2), [10, 12], "story", [14, null]);
    expect(items.map((t) => t.refRating)).toEqual([14, null]);
  });
});
