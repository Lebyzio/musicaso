import { isHalfStep, type Rating } from "../score";

/**
 * Compact rating string (AGENTS.md §5.1): one character per track, in track order.
 * `0`–`9`, `a`–`k` = 0–20 half-steps (base 36), `_` = skipped, `.` = not rated yet.
 */
export const RATINGS_PATTERN = /^[0-9a-k_.]*$/;

export function encodeRatings(ratings: readonly Rating[]): string {
  return ratings
    .map((r) => {
      if (r === null) return ".";
      if (r === "skip") return "_";
      if (!isHalfStep(r)) throw new RangeError(`Invalid rating: ${r}`);
      return r.toString(36);
    })
    .join("");
}

/** Returns null for any character outside the alphabet — callers decide how to recover. */
export function decodeRatings(encoded: string): Rating[] | null {
  if (!RATINGS_PATTERN.test(encoded)) return null;
  return [...encoded].map((c) => {
    if (c === ".") return null;
    if (c === "_") return "skip";
    return parseInt(c, 36);
  });
}

/** Pad with `null` / truncate so ratings line up with the current tracklist. */
export function fitRatings(ratings: readonly Rating[], trackCount: number): Rating[] {
  return Array.from({ length: trackCount }, (_, i) => ratings[i] ?? null);
}
