import { isAllowedImageUrl } from "./music/hosts";
import { albumScore, type Rating } from "./score";
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
  m?: StoredAlbum; // album details, so the library can list reviews without refetching
  sc?: number; // album score (0–10) as last shown, including length weighting
  updatedAt: number;
}

interface StoredAlbum {
  t: string; // title
  ar: string; // artist
  y?: number; // year
  c?: string; // cover thumbnail URL (allowlisted hosts only)
}

/** Album details stored with a draft for the review library. */
export interface DraftAlbum {
  title: string;
  artist: string;
  year?: number;
  cover?: string;
}

const META_MAX = 300;

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
    (d.m === undefined || parseStoredAlbum(d.m) !== null) &&
    (d.sc === undefined || (typeof d.sc === "number" && d.sc >= 0 && d.sc <= 10)) &&
    typeof d.updatedAt === "number";
  return ok ? (d as unknown as StoredDraft) : null;
}

function parseStoredAlbum(data: unknown): StoredAlbum | null {
  if (typeof data !== "object" || data === null) return null;
  const m = data as Record<string, unknown>;
  const ok =
    typeof m.t === "string" &&
    m.t.length <= META_MAX &&
    typeof m.ar === "string" &&
    m.ar.length <= META_MAX &&
    (m.y === undefined || (Number.isInteger(m.y) && (m.y as number) > 0)) &&
    // Rendered as an <img> later — only ever from the cover CDNs we already trust.
    (m.c === undefined || (typeof m.c === "string" && m.c.length <= 500 && isAllowedImageUrl(m.c)));
  return ok ? (m as unknown as StoredAlbum) : null;
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
  return `${DRAFT_PREFIX}${source}:${id}`;
}

/** localStorage can be missing or throw (private mode, blocked site data) — never let that escape. */
function defaultStorage(): Storage | null {
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
    album?: DraftAlbum;
    score?: number | null;
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
      ...(draft.album ? { m: storedAlbum(draft.album) } : {}),
      ...(typeof draft.score === "number" ? { sc: Math.round(draft.score * 100) / 100 } : {}),
      updatedAt: now,
    };
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function storedAlbum(album: DraftAlbum): StoredAlbum {
  return {
    t: album.title.slice(0, META_MAX),
    ar: album.artist.slice(0, META_MAX),
    ...(album.year ? { y: album.year } : {}),
    ...(album.cover && isAllowedImageUrl(album.cover) ? { c: album.cover } : {}),
  };
}

/**
 * Adds album details to an existing draft without touching its ratings or edit time.
 * For drafts saved before details were stored. Returns false if there is no such draft.
 */
export function attachAlbum(
  source: string,
  id: string,
  album: DraftAlbum,
  storage: StorageLike | null = defaultStorage(),
): boolean {
  try {
    const key = draftKey(source, id);
    const stored = parseStoredDraft(safeJson(storage?.getItem(key) ?? null));
    if (!storage || !stored) return false;
    storage.setItem(key, JSON.stringify({ ...stored, m: storedAlbum(album) }));
    return true;
  } catch {
    return false;
  }
}

export interface LibraryEntry {
  source: string;
  id: string;
  /** null for drafts saved before album details were stored; opening the album fills it in. */
  album: DraftAlbum | null;
  ratings: Rating[];
  weighted: boolean;
  name: string;
  text: string;
  score: number | null;
  updatedAt: number;
}

const DRAFT_PREFIX = "musicaso:draft:";

/** Every saved review in this browser, most recently edited first. Unreadable entries are skipped. */
export function listDrafts(
  storage: Pick<Storage, "getItem" | "key" | "length"> | null = defaultStorage(),
): LibraryEntry[] {
  const entries: LibraryEntry[] = [];
  try {
    if (!storage) return entries;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key?.startsWith(DRAFT_PREFIX)) continue;
      const [source, id] = key.slice(DRAFT_PREFIX.length).split(":");
      if (!source || !id) continue;
      const stored = parseStoredDraft(safeJson(storage.getItem(key)));
      const ratings = stored && decodeRatings(stored.r);
      if (!stored || !ratings) continue;
      entries.push({
        source,
        id,
        album: stored.m
          ? {
              title: stored.m.t,
              artist: stored.m.ar,
              ...(stored.m.y ? { year: stored.m.y } : {}),
              ...(stored.m.c ? { cover: stored.m.c } : {}),
            }
          : null,
        ratings,
        weighted: stored.w ?? false,
        name: stored.n ?? "",
        text: stored.t ?? "",
        score: stored.sc ?? albumScore(ratings),
        updatedAt: stored.updatedAt,
      });
    }
  } catch {
    // Storage became unavailable mid-read — show what we have.
  }
  return entries.sort((a, b) => b.updatedAt - a.updatedAt);
}

function safeJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
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
