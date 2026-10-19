import { type Comparison, compareRatings } from "../compare";
import type { Album } from "../music/types";
import {
  type AlbumStats,
  albumScore,
  albumStats,
  type Rating,
  type Verdict,
  verdict,
} from "../score";
import { decodeRatings, fitRatings } from "./ratings";
import type { ReviewPayload } from "./schema";

/** Everything the shared-review page, its metadata and its OG image derive from a payload. */
export interface ReviewView {
  ratings: Rating[];
  score: number | null;
  verdict: Verdict | null;
  stats: AlbumStats;
  /** Favourite track index: explicit `f`, else the highest-scored track. */
  favorite: number | undefined;
  /** The tracklist changed since the review was made; ratings are matched by position. */
  mismatch: boolean;
  name: string | undefined;
  text: string | undefined;
  reference: { name: string | undefined; ratings: Rating[] } | null;
  comparison: Comparison | null;
}

export function reviewView(album: Album, p: ReviewPayload): ReviewView {
  const count = album.tracks.length;
  const ratings = fitRatings(decodeRatings(p.r) ?? [], count);
  const weights = p.w ? album.tracks.map((t) => t.durationSec) : undefined;
  const score = albumScore(ratings, weights);
  const stats = albumStats(ratings);
  const refRatings = p.ref ? fitRatings(decodeRatings(p.ref.r) ?? [], count) : null;

  return {
    ratings,
    score,
    verdict: verdict(score),
    stats,
    favorite: p.f !== undefined && p.f < count ? p.f : stats.highest?.index,
    mismatch: p.k !== count,
    name: p.n,
    text: p.t,
    reference: refRatings && { name: p.ref?.n, ratings: refRatings },
    comparison: refRatings && compareRatings(ratings, refRatings),
  };
}
