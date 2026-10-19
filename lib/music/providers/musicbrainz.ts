import { z } from "zod";
import { ProviderError } from "../errors";
import { fetchJson, parseResponse, REVALIDATE } from "../http";
import type { Album, AlbumSummary, MusicProvider, RecordType, Track } from "../types";

const BASE = "https://musicbrainz.org/ws/2";
const COVERS = "https://coverartarchive.org";
/** MusicBrainz asks every client to identify itself; anonymous user agents get throttled harder. */
const USER_AGENT = "musicaso/0.1 ( https://github.com/Lebyzio/musicaso )";
/** MusicBrainz allows one request per second per client. */
const MIN_GAP_MS = 1100;
const SEARCH_LIMIT = 25;
const BROWSE_LIMIT = 100;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// --- Schemas (only the fields we use; zod strips the rest) ---

const ArtistCreditSchema = z
  .array(z.object({ name: z.string(), joinphrase: z.string().optional() }))
  .optional();

const GroupTypeFields = {
  "primary-type": z.string().nullish(),
  "secondary-types": z.array(z.string()).optional(),
};

const GenresSchema = z.array(z.object({ name: z.string(), count: z.number() })).optional();

export const MbSearchSchema = z.object({
  "release-groups": z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      "first-release-date": z.string().optional(),
      "artist-credit": ArtistCreditSchema,
      ...GroupTypeFields,
    }),
  ),
});

export const MbBrowseSchema = z.object({
  releases: z.array(
    z.object({
      id: z.string(),
      status: z.string().nullish(),
      date: z.string().optional(),
      "cover-art-archive": z.object({ front: z.boolean() }).optional(),
      media: z.array(z.object({ format: z.string().nullish(), "track-count": z.number() })),
    }),
  ),
});

export const MbReleaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  "artist-credit": ArtistCreditSchema,
  genres: GenresSchema,
  "release-group": z.object({
    id: z.string(),
    title: z.string(),
    "first-release-date": z.string().optional(),
    genres: GenresSchema,
    ...GroupTypeFields,
  }),
  media: z.array(
    z.object({
      position: z.number(),
      tracks: z
        .array(
          z.object({
            id: z.string(),
            position: z.number(),
            title: z.string(),
            length: z.number().nullish(),
            recording: z.object({ video: z.boolean().optional() }).optional(),
          }),
        )
        .optional(),
    }),
  ),
});

type MbSearch = z.infer<typeof MbSearchSchema>;
type MbBrowseRelease = z.infer<typeof MbBrowseSchema>["releases"][number];
type MbRelease = z.infer<typeof MbReleaseSchema>;

// --- Mappers (pure) ---

/** Release types we list. Singles are left out: this is an album review site. */
const LISTED_TYPES = new Set(["Album", "EP"]);

function recordType(group: {
  "primary-type"?: string | null;
  "secondary-types"?: string[];
}): RecordType | undefined {
  if (group["secondary-types"]?.includes("Compilation")) return "compilation";
  switch (group["primary-type"]) {
    case "Album":
      return "album";
    case "EP":
      return "ep";
    case "Single":
      return "single";
    default:
      return undefined;
  }
}

function artistName(credit: z.infer<typeof ArtistCreditSchema>): string {
  return credit?.map((c) => c.name + (c.joinphrase ?? "")).join("") || "Unknown artist";
}

function parseYear(date: string | undefined): number | undefined {
  const year = Number(date?.slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : undefined;
}

/** Cover Art Archive picks a representative front cover for the whole release group. */
export function groupCoverUrl(groupId: string, px: 250 | 500 | 1200): string {
  return `${COVERS}/release-group/${groupId}/front-${px}`;
}

export function mapMbSearch(body: MbSearch): AlbumSummary[] {
  return body["release-groups"]
    .filter((g) => LISTED_TYPES.has(g["primary-type"] ?? ""))
    .map((g) => ({
      source: "mb",
      id: g.id,
      title: g.title,
      artist: artistName(g["artist-credit"]),
      year: parseYear(g["first-release-date"]),
      // May 404 when no release in the group has art; the card falls back to a placeholder.
      coverThumbUrl: groupCoverUrl(g.id, 500),
      recordType: recordType(g),
    }));
}

/** Formats whose track lengths are usually filled in, and that match what people stream. */
const PREFERRED_FORMATS = new Set(["CD", "Digital Media", "Enhanced CD", "HDCD", "SACD"]);

function trackTotal(r: MbBrowseRelease): number {
  return r.media.reduce((sum, m) => sum + m["track-count"], 0);
}

/**
 * The release whose tracklist stands for the album. Deterministic, so a shared review's
 * track count keeps matching: official releases, then the most common track count (skips
 * deluxe and bonus-track editions), then CD/digital, then the earliest date, then id.
 */
export function pickRelease(releases: MbBrowseRelease[]): MbBrowseRelease | undefined {
  const official = releases.filter((r) => r.status === "Official");
  const pool = official.length > 0 ? official : releases;
  const counts = new Map<number, number>();
  for (const r of pool) counts.set(trackTotal(r), (counts.get(trackTotal(r)) ?? 0) + 1);
  const rank = (r: MbBrowseRelease) => [
    -(counts.get(trackTotal(r)) ?? 0),
    r.media.every((m) => PREFERRED_FORMATS.has(m.format ?? "")) ? 0 : 1,
  ];
  return [...pool].sort((a, b) => {
    const [ca, fa] = rank(a);
    const [cb, fb] = rank(b);
    return (
      ca - cb ||
      fa - fb ||
      (a.date || "9999").localeCompare(b.date || "9999") ||
      a.id.localeCompare(b.id)
    );
  })[0];
}

function topGenre(release: MbRelease): string | undefined {
  const genres = [...(release.genres ?? []), ...(release["release-group"].genres ?? [])];
  const best = genres.sort((a, b) => b.count - a.count)[0]?.name;
  return best ? best.charAt(0).toUpperCase() + best.slice(1) : undefined;
}

export function mapMbTracks(release: MbRelease): Track[] {
  return [...release.media]
    .sort((a, b) => a.position - b.position)
    .flatMap((medium) =>
      [...(medium.tracks ?? [])]
        .filter((t) => !t.recording?.video) // DVD bonus discs list music videos as tracks
        .sort((a, b) => a.position - b.position)
        .map((t) => ({ disc: medium.position, t })),
    )
    .map(({ disc, t }, i) => ({
      id: t.id,
      position: i + 1,
      disc,
      title: t.title,
      // Lengths are optional on MusicBrainz; 0 counts as weight 1 in a length-weighted score.
      durationSec: t.length ? Math.round(t.length / 1000) : 0,
    }));
}

export function mapMbAlbum(groupId: string, release: MbRelease, hasCover: boolean): Album {
  const group = release["release-group"];
  return {
    source: "mb",
    id: groupId,
    title: group.title,
    artist: artistName(release["artist-credit"]),
    year: parseYear(group["first-release-date"]),
    coverUrl: hasCover ? groupCoverUrl(groupId, 1200) : "",
    coverThumbUrl: hasCover ? groupCoverUrl(groupId, 500) : "",
    genre: topGenre(release),
    recordType: recordType(group),
    tracks: mapMbTracks(release),
    externalUrl: `https://musicbrainz.org/release-group/${groupId}`,
  };
}

// --- Fetching ---

/** Faster than any real round trip to MusicBrainz: the answer came from the Data Cache. */
const CACHE_HIT_MS = 40;

/**
 * One request per second from this server instance (each Vercel instance throttles itself).
 * A task that finishes almost instantly was served from the Data Cache, so it gives its slot back
 * — otherwise a cached album (two lookups) would still take over a second.
 */
export function createThrottle(gapMs: number) {
  let nextSlot = 0;
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const start = Math.max(now, nextSlot);
    nextSlot = start + gapMs;
    if (start > now) await new Promise((resolve) => setTimeout(resolve, start - now));
    const began = Date.now();
    try {
      return await task();
    } finally {
      if (Date.now() - began < CACHE_HIT_MS) nextSlot = Math.max(Date.now(), nextSlot - gapMs);
    }
  };
}

export function createMusicBrainz(gapMs = MIN_GAP_MS): MusicProvider {
  const throttle = createThrottle(gapMs);

  async function mbGet<S extends z.ZodType>(
    path: string,
    schema: S,
    revalidate: number,
  ): Promise<z.infer<S>> {
    for (let attempt = 0; ; attempt++) {
      try {
        const body = await throttle(() =>
          fetchJson(`${BASE}${path}`, revalidate, { "user-agent": USER_AGENT }),
        );
        return parseResponse(schema, body);
      } catch (err) {
        // The 1 req/s budget is per IP, and serverless IPs are shared — one more slot usually works.
        const limited = err instanceof ProviderError && err.code === "rate_limited";
        if (!limited || attempt >= 1) throw err;
      }
    }
  }

  return {
    id: "mb",

    async searchAlbums(query: string): Promise<AlbumSummary[]> {
      // dismax searches titles and artist names together, like the MusicBrainz website does.
      const path = `/release-group?query=${encodeURIComponent(query)}&dismax=true&fmt=json&limit=${SEARCH_LIMIT}`;
      return mapMbSearch(await mbGet(path, MbSearchSchema, REVALIDATE.search));
    },

    /** `id` is a release-group (the album); its tracklist comes from one representative release. */
    async getAlbum(id: string): Promise<Album> {
      if (!UUID.test(id)) throw new ProviderError("not_found", "Invalid MusicBrainz id");
      const browse = await mbGet(
        `/release?release-group=${id}&inc=media&fmt=json&limit=${BROWSE_LIMIT}`,
        MbBrowseSchema,
        REVALIDATE.album,
      );
      const chosen = pickRelease(browse.releases);
      if (!chosen) throw new ProviderError("not_found", "MusicBrainz album has no releases");
      const release = await mbGet(
        `/release/${chosen.id}?inc=recordings+artist-credits+release-groups+genres&fmt=json`,
        MbReleaseSchema,
        REVALIDATE.album,
      );
      if (release["release-group"].id !== id) {
        throw new ProviderError("invalid_response", "Release belongs to another release group");
      }
      const hasCover = browse.releases.some((r) => r["cover-art-archive"]?.front);
      return mapMbAlbum(id, release, hasCover);
    },
  };
}

export const musicbrainz = createMusicBrainz();
