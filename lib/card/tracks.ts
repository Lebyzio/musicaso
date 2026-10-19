import type { Track } from "../music/types";
import { isScored, type Rating } from "../score";
import type { CardFormat } from "./themes";

export interface CardTrack {
  index: number;
  position: number;
  title: string;
  rating: Rating;
  refRating?: Rating;
}

export interface CardTrackList {
  items: CardTrack[];
  /** The list is a selection rather than the whole album. */
  highlights: boolean;
}

/** A story card fits this many rows; longer albums get their best tracks instead. */
export const STORY_MAX_ROWS = 14;
export const STORY_HIGHLIGHTS = 10;
export const SQUARE_TOP = 3;

function topScored(items: CardTrack[], count: number): CardTrack[] {
  return items
    .filter((t) => isScored(t.rating))
    .sort((a, b) => (b.rating as number) - (a.rating as number) || a.index - b.index)
    .slice(0, count);
}

/**
 * Which tracks a card shows.
 * - square: the top 3 by score
 * - story: every track if the album fits, else the top 10 back in album order
 */
export function cardTracks(
  tracks: readonly Track[],
  ratings: readonly Rating[],
  format: CardFormat,
  refRatings?: readonly Rating[],
): CardTrackList {
  const all: CardTrack[] = tracks.map((t, i) => ({
    index: i,
    position: t.position,
    title: t.title,
    rating: ratings[i] ?? null,
    ...(refRatings && { refRating: refRatings[i] ?? null }),
  }));

  if (format === "square") return { items: topScored(all, SQUARE_TOP), highlights: true };
  if (all.length <= STORY_MAX_ROWS) return { items: all, highlights: false };
  return {
    items: topScored(all, STORY_HIGHLIGHTS).sort((a, b) => a.index - b.index),
    highlights: true,
  };
}
