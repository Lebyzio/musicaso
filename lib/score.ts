/**
 * Scoring rules — the single source of truth for album scores and verdicts.
 *
 * Track ratings are stored as integer half-steps (0–20 → 0.0–10.0) so arithmetic and
 * URL encoding stay exact. `"skip"` marks interludes/skits; `null` means not rated yet.
 */

export const MAX_HALF_STEPS = 20;

export type Rating = number | "skip" | null;

export function isScored(rating: Rating): rating is number {
  return typeof rating === "number";
}

export function isHalfStep(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_HALF_STEPS;
}

export function toScore(halfSteps: number): number {
  return halfSteps / 2;
}

export function clampHalfSteps(value: number): number {
  return Math.min(MAX_HALF_STEPS, Math.max(0, Math.round(value)));
}

/** Round to one decimal, half-up (8.25 → 8.3), immune to float noise like 8.249999. */
export function roundScore(score: number): number {
  return Math.round(score * 10 + 1e-9) / 10;
}

export function formatScore(score: number | null): string {
  return score === null ? "–" : roundScore(score).toFixed(1);
}

/**
 * Average of scored, non-skipped tracks (0–10), or null if nothing is scored yet.
 * `weights` (e.g. track durations) turns it into a weighted mean; non-positive weights count as 1.
 */
export function albumScore(ratings: readonly Rating[], weights?: readonly number[]): number | null {
  let sum = 0;
  let total = 0;
  ratings.forEach((rating, i) => {
    if (!isScored(rating)) return;
    const w = weights && weights[i] > 0 ? weights[i] : 1;
    sum += toScore(rating) * w;
    total += w;
  });
  return total === 0 ? null : sum / total;
}

export const VERDICTS = [
  { min: 9, label: "Masterpiece" },
  { min: 8, label: "Great" },
  { min: 6.5, label: "Good" },
  { min: 5, label: "Mixed" },
  { min: -Infinity, label: "Skip" },
] as const;

export type Verdict = (typeof VERDICTS)[number]["label"];

/** Verdict for the score as displayed (rounded), so "9.0" never reads as "Great". */
export function verdict(score: number | null): Verdict | null {
  if (score === null) return null;
  const rounded = roundScore(score);
  return VERDICTS.find((v) => rounded >= v.min)!.label;
}

export type Consistency = "Rock solid" | "Consistent" | "Uneven" | "All over the place";

const CONSISTENCY: { maxSd: number; label: Consistency }[] = [
  { maxSd: 0.75, label: "Rock solid" },
  { maxSd: 1.5, label: "Consistent" },
  { maxSd: 2.5, label: "Uneven" },
  { maxSd: Infinity, label: "All over the place" },
];

/** Needs at least this many scored tracks before consistency means anything. */
const MIN_FOR_CONSISTENCY = 3;

export interface TrackPick {
  index: number;
  score: number;
}

export interface AlbumStats {
  total: number;
  scored: number;
  skipped: number;
  unrated: number;
  /** Highest / lowest scored track; ties go to the earliest track. */
  highest: TrackPick | null;
  lowest: TrackPick | null;
  atLeast8: number;
  stdDev: number | null;
  consistency: Consistency | null;
}

export function albumStats(ratings: readonly Rating[]): AlbumStats {
  const scored = ratings
    .map((rating, index) => (isScored(rating) ? { index, score: toScore(rating) } : null))
    .filter((x): x is TrackPick => x !== null);

  let highest: TrackPick | null = null;
  let lowest: TrackPick | null = null;
  for (const pick of scored) {
    if (!highest || pick.score > highest.score) highest = pick;
    if (!lowest || pick.score < lowest.score) lowest = pick;
  }

  let stdDev: number | null = null;
  if (scored.length >= MIN_FOR_CONSISTENCY) {
    const mean = scored.reduce((s, p) => s + p.score, 0) / scored.length;
    stdDev = Math.sqrt(scored.reduce((s, p) => s + (p.score - mean) ** 2, 0) / scored.length);
  }

  const skipped = ratings.filter((r) => r === "skip").length;
  return {
    total: ratings.length,
    scored: scored.length,
    skipped,
    unrated: ratings.length - scored.length - skipped,
    highest,
    lowest,
    atLeast8: scored.filter((p) => p.score >= 8).length,
    stdDev,
    consistency: stdDev === null ? null : CONSISTENCY.find((c) => stdDev! <= c.maxSd)!.label,
  };
}
