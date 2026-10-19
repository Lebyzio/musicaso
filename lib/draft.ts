import { z } from "zod";
import type { Rating } from "./score";
import { decodeRatings, encodeRatings, fitRatings, RATINGS_PATTERN } from "./share/ratings";
import { NAME_MAX, TEXT_MAX } from "./share/schema";

/** In-progress reviews live only in this browser's localStorage. */

const DraftSchema = z.object({
  v: z.literal(1),
  k: z.number().int().nonnegative(), // track count when saved
  r: z.string().max(1000).regex(RATINGS_PATTERN),
  w: z.boolean().optional(), // weight by track length
  n: z.string().max(NAME_MAX).optional(), // reviewer name
  t: z.string().max(TEXT_MAX).optional(), // review text
  updatedAt: z.number(),
});

export interface Draft {
  ratings: Rating[];
  weighted: boolean;
  name: string;
  text: string;
  updatedAt: number;
  /** The tracklist changed since this draft was saved; ratings were matched by position. */
  mismatch: boolean;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function draftKey(source: string, id: string): string {
  return `musicaso:draft:${source}:${id}`;
}

/** localStorage can be missing or throw (private mode, blocked site data) — never let that escape. */
function defaultStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadDraft(
  source: string,
  id: string,
  trackCount: number,
  storage: StorageLike | null = defaultStorage(),
): Draft | null {
  try {
    const raw = storage?.getItem(draftKey(source, id));
    if (!raw) return null;
    const parsed = DraftSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const ratings = decodeRatings(parsed.data.r);
    if (!ratings) return null;
    return {
      ratings: fitRatings(ratings, trackCount),
      weighted: parsed.data.w ?? false,
      name: parsed.data.n ?? "",
      text: parsed.data.t ?? "",
      updatedAt: parsed.data.updatedAt,
      mismatch: parsed.data.k !== trackCount,
    };
  } catch {
    return null;
  }
}

/** Saves the draft, or removes it when there is nothing worth keeping. Returns false on failure. */
export function saveDraft(
  source: string,
  id: string,
  draft: { ratings: readonly Rating[]; weighted: boolean; name?: string; text?: string },
  storage: StorageLike | null = defaultStorage(),
  now: number = Date.now(),
): boolean {
  if (!storage) return false;
  try {
    const key = draftKey(source, id);
    const name = draft.name?.trim();
    const text = draft.text?.trim();
    // The name alone isn't worth a draft: it is pre-filled from loadReviewerName() on every album.
    if (draft.ratings.every((r) => r === null) && !draft.weighted && !text) {
      storage.removeItem(key);
      return true;
    }
    const value: z.infer<typeof DraftSchema> = {
      v: 1,
      k: draft.ratings.length,
      r: encodeRatings(draft.ratings),
      ...(draft.weighted ? { w: true } : {}),
      ...(name ? { n: name } : {}),
      ...(text ? { t: text } : {}),
      updatedAt: now,
    };
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(
  source: string,
  id: string,
  storage: StorageLike | null = defaultStorage(),
): void {
  try {
    storage?.removeItem(draftKey(source, id));
  } catch {
    // Nothing to do — the draft simply stays.
  }
}

const NAME_KEY = "musicaso:name";

/** The reviewer name is remembered across albums so it only has to be typed once. */
export function loadReviewerName(storage: StorageLike | null = defaultStorage()): string {
  try {
    return (storage?.getItem(NAME_KEY) ?? "").slice(0, NAME_MAX);
  } catch {
    return "";
  }
}

export function saveReviewerName(
  name: string,
  storage: StorageLike | null = defaultStorage(),
): void {
  try {
    const trimmed = name.trim();
    if (trimmed) storage?.setItem(NAME_KEY, trimmed.slice(0, NAME_MAX));
  } catch {
    // Not worth surfacing — the name is just a convenience.
  }
}
