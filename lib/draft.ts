import type { Rating } from "./score";
import { NAME_MAX, TEXT_MAX } from "./share/limits";
import { decodeRatings, encodeRatings, fitRatings, RATINGS_PATTERN } from "./share/ratings";

/** In-progress reviews live only in this browser's localStorage. */

interface StoredDraft {
  v: 1;
  k: number; // track count when saved
  r: string; // compact ratings
  w?: boolean; // weight by track length
  n?: string; // reviewer name
  t?: string; // review text
  th?: string; // card theme
  updatedAt: number;
}

const optionalString = (value: unknown, max: number) =>
  value === undefined || (typeof value === "string" && value.length <= max);

/** Validated by hand rather than with zod: this runs in the browser bundle. */
function parseStoredDraft(data: unknown): StoredDraft | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  const ok =
    d.v === 1 &&
    Number.isInteger(d.k) &&
    (d.k as number) >= 0 &&
    typeof d.r === "string" &&
    d.r.length <= 1000 &&
    RATINGS_PATTERN.test(d.r) &&
    (d.w === undefined || typeof d.w === "boolean") &&
    optionalString(d.n, NAME_MAX) &&
    optionalString(d.t, TEXT_MAX) &&
    optionalString(d.th, 20) &&
    typeof d.updatedAt === "number";
  return ok ? (d as unknown as StoredDraft) : null;
}

export interface Draft {
  ratings: Rating[];
  weighted: boolean;
  name: string;
  text: string;
  theme: string | undefined;
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
    const stored = parseStoredDraft(JSON.parse(raw));
    if (!stored) return null;
    const ratings = decodeRatings(stored.r);
    if (!ratings) return null;
    return {
      ratings: fitRatings(ratings, trackCount),
      weighted: stored.w ?? false,
      name: stored.n ?? "",
      text: stored.t ?? "",
      theme: stored.th,
      updatedAt: stored.updatedAt,
      mismatch: stored.k !== trackCount,
    };
  } catch {
    return null;
  }
}

/** Saves the draft, or removes it when there is nothing worth keeping. Returns false on failure. */
export function saveDraft(
  source: string,
  id: string,
  draft: {
    ratings: readonly Rating[];
    weighted: boolean;
    name?: string;
    text?: string;
    theme?: string;
  },
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
    const value: StoredDraft = {
      v: 1,
      k: draft.ratings.length,
      r: encodeRatings(draft.ratings),
      ...(draft.weighted ? { w: true } : {}),
      ...(name ? { n: name } : {}),
      ...(text ? { t: text } : {}),
      ...(draft.theme && draft.theme !== "sleeve" ? { th: draft.theme } : {}),
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
