import { z } from "zod";
import { ProviderError } from "../errors";
import { fetchJson, parseResponse, REVALIDATE } from "../http";
import type { Album, AlbumSummary, MusicProvider, RecordType, Track } from "../types";

const BASE = "https://itunes.apple.com";
/** Thai storefront first (Thai catalogue + Thai titles), then the US one. */
const COUNTRIES = ["th", "us"] as const;
type Country = (typeof COUNTRIES)[number];

// --- Schemas ---

const CollectionSchema = z.object({
  wrapperType: z.literal("collection"),
  collectionId: z.number(),
  collectionName: z.string(),
  collectionType: z.string().optional(),
  artistName: z.string(),
  artworkUrl100: z.string().optional(),
  releaseDate: z.string().optional(),
  trackCount: z.number().optional(),
  primaryGenreName: z.string().optional(),
  collectionViewUrl: z.string().optional(),
});

const SongSchema = z.object({
  wrapperType: z.literal("track"),
  kind: z.literal("song"),
  trackId: z.number(),
  trackName: z.string(),
  discNumber: z.number().default(1),
  trackNumber: z.number(),
  trackTimeMillis: z.number().default(0),
  previewUrl: z.string().optional(),
  trackExplicitness: z.string().optional(),
});

/** Results mix collections, songs and music videos; each item is validated by kind below. */
const ResultsSchema = z.object({
  resultCount: z.number(),
  results: z.array(z.looseObject({ wrapperType: z.string(), kind: z.string().optional() })),
});

type Collection = z.infer<typeof CollectionSchema>;
type Song = z.infer<typeof SongSchema>;
type Results = z.infer<typeof ResultsSchema>;

// --- Mappers (pure) ---

/** artworkUrl100 ends in `/100x100bb.jpg`; the CDN serves any size from the same path. */
export function resizeArtwork(url: string | undefined, size: number): string {
  if (!url) return "";
  return url.replace(/\/\d+x\d+bb\.(jpg|png|webp)$/, `/${size}x${size}bb.$1`);
}

/** iTunes appends " - Single" / " - EP" to collection names. */
export function splitRecordType(
  collection: Pick<Collection, "collectionName" | "collectionType">,
): { title: string; recordType: RecordType } {
  const match = collection.collectionName.match(/^(.*) - (Single|EP)$/);
  if (match) {
    return { title: match[1], recordType: match[2] === "EP" ? "ep" : "single" };
  }
  return {
    title: collection.collectionName,
    recordType: collection.collectionType === "Compilation" ? "compilation" : "album",
  };
}

function parseYear(date: string | undefined): number | undefined {
  const year = Number(date?.slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : undefined;
}

function stripTracking(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const u = new URL(url);
  u.searchParams.delete("uo");
  return u.toString();
}

function collections(body: Results): Collection[] {
  return body.results
    .filter((r) => r.wrapperType === "collection")
    .map((r) => parseResponse(CollectionSchema, r));
}

function songs(body: Results): Song[] {
  return body.results
    .filter((r) => r.wrapperType === "track" && r.kind === "song")
    .map((r) => parseResponse(SongSchema, r));
}

export function mapItunesSearch(body: Results): AlbumSummary[] {
  return collections(body).map((c) => {
    const { title, recordType } = splitRecordType(c);
    return {
      source: "it",
      id: String(c.collectionId),
      title,
      artist: c.artistName,
      year: parseYear(c.releaseDate),
      coverThumbUrl: resizeArtwork(c.artworkUrl100, 500),
      trackCount: c.trackCount,
      recordType,
    };
  });
}

export function mapItunesTracks(list: Song[]): Track[] {
  return [...list]
    .sort((a, b) => a.discNumber - b.discNumber || a.trackNumber - b.trackNumber)
    .map((s, i) => ({
      id: String(s.trackId),
      position: i + 1,
      disc: s.discNumber,
      title: s.trackName,
      durationSec: Math.round(s.trackTimeMillis / 1000),
      previewUrl: s.previewUrl,
      explicit: s.trackExplicitness === "explicit",
    }));
}

/** Lookup results: the first collection is the album, the songs are its tracks. */
export function mapItunesLookup(body: Results): Album | undefined {
  const [collection] = collections(body);
  if (!collection) return undefined;
  const { title, recordType } = splitRecordType(collection);
  return {
    source: "it",
    id: String(collection.collectionId),
    title,
    artist: collection.artistName,
    year: parseYear(collection.releaseDate),
    coverUrl: resizeArtwork(collection.artworkUrl100, 1000),
    coverThumbUrl: resizeArtwork(collection.artworkUrl100, 500),
    genre: collection.primaryGenreName,
    recordType,
    tracks: mapItunesTracks(songs(body)),
    externalUrl: stripTracking(collection.collectionViewUrl),
  };
}

// --- Fetching ---

async function itunesGet(path: string, params: Record<string, string>, country: Country) {
  const qs = new URLSearchParams({ ...params, country });
  const body = await fetchJson(
    `${BASE}${path}?${qs}`,
    REVALIDATE[path === "/search" ? "search" : "album"],
  );
  return parseResponse(ResultsSchema, body);
}

export const itunes = {
  id: "it",

  async searchAlbums(query: string): Promise<AlbumSummary[]> {
    for (const country of COUNTRIES) {
      const body = await itunesGet(
        "/search",
        { term: query, entity: "album", media: "music", limit: "20" },
        country,
      );
      const results = mapItunesSearch(body);
      if (results.length > 0) return results;
    }
    return [];
  },

  async getAlbum(id: string): Promise<Album> {
    if (!/^\d{1,20}$/.test(id)) throw new ProviderError("not_found", "Invalid iTunes id");
    // An album found in the Thai storefront may not exist in the US one, and vice versa.
    for (const country of COUNTRIES) {
      // Default lookup limit is 50 entities — too few for deluxe editions.
      const body = await itunesGet("/lookup", { id, entity: "song", limit: "200" }, country);
      const album = mapItunesLookup(body);
      if (album) return album;
    }
    throw new ProviderError("not_found", "Album not found on Apple Music");
  },
} satisfies MusicProvider;
