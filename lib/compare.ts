import { albumScore, isScored, type Rating, toScore } from "./score";

/** Two scores this close (in points) count as agreeing. */
export const AGREE_WITHIN = 1;

export interface Comparison {
  /** Tracks both reviewers scored. */
  both: number;
  /** Of those, how many are within AGREE_WITHIN of each other. */
  agree: number;
  /** Largest disagreement; ties go to the earliest track. */
  biggestSplit: { index: number; a: number; b: number; diff: number } | null;
  scoreA: number | null;
  scoreB: number | null;
}

export function compareRatings(a: readonly Rating[], b: readonly Rating[]): Comparison {
  let both = 0;
  let agree = 0;
  let biggestSplit: Comparison["biggestSplit"] = null;

  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const ra = a[i];
    const rb = b[i];
    if (!isScored(ra) || !isScored(rb)) continue;
    both++;
    const sa = toScore(ra);
    const sb = toScore(rb);
    const diff = Math.abs(sa - sb);
    if (diff <= AGREE_WITHIN) agree++;
    if (diff > 0 && (!biggestSplit || diff > biggestSplit.diff)) {
      biggestSplit = { index: i, a: sa, b: sb, diff };
    }
  }

  return { both, agree, biggestSplit, scoreA: albumScore(a), scoreB: albumScore(b) };
}
