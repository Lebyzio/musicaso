import { z } from "zod";
import { ProviderError } from "../errors";
import { fetchJson, parseResponse, REVALIDATE } from "../http";
import { isSameName } from "../match";
import type { Album, AlbumSummary, MusicProvider, RecordType, Track } from "../types";

const BASE = "https://api.deezer.com";
const TRACKS_PAGE_SIZE = 100;
const MAX_TRACK_PAGES = 10;

// --- Schemas (only the fields we use; zod strips the rest) ---

/** Deezer reports failures as HTTP 200 with `{ error: {...} }`. */
const DeezerErrorSchema = z.object({
  error: z.object({ type: z.string(), message: z.string(), code: z.number() }),
});

const ArtistSchema = z.object({ name: z.string() });

const CoverFields = {
  cover_medium: z.string().nullish(),
  cover_big: z.string().nullish(),
  cover_xl: z.string().nullish(),
};

export const DeezerSearchSchema = z.object({
  data: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      nb_tracks: z.number().optional(),
      record_type: z.string().optional(),
      artist: ArtistSchema,
      ...CoverFields,
    }),
  ),
});

export const DeezerAlbumSchema = z.object({
  id: z.number(),
  title: z.string(),
  link: z.string().optional(),
  release_date: z.string().optional(),
  record_type: z.string().optional(),
  genres: z.object({ data: z.array(z.object({ name: z.string() })) }).optional(),
  artist: ArtistSchema,
  ...CoverFields,
});

export const DeezerTracksPageSchema = z.object({
  data: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      duration: z.number(),
      track_position: z.number(),
      disk_number: z.number(),
      preview: z.string().nullish(),
      explicit_lyrics: z.boolean().optional(),
    }),
  ),
  next: z.string().optional(),
});

const DeezerTrackSchema = z.object({ id: z.number(), preview: z.string().nullish() });

export const DeezerArtistSearchSchema = z.object({
  data: z.array(z.object({ id: z.number(), name: z.string() })),
});

export const DeezerArtistAlbumsSchema = z.object({
  data: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      release_date: z.string().optional(),
      record_type: z.string().optional(),
      fans: z.number().optional(),
      ...CoverFields,
    }),
  ),
});

type DeezerSearch = z.infer<typeof DeezerSearchSchema>;
type DeezerAlbum = z.infer<typeof DeezerAlbumSchema>;
type DeezerTracksPage = z.infer<typeof DeezerTracksPageSchema>;
type DeezerTrack = DeezerTracksPage["data"][number];
type DeezerArtistAlbums = z.infer<typeof DeezerArtistAlbumsSchema>;

// --- Mappers (pure) ---

const RECORD_TYPES: Record<string, RecordType> = {
  album: "album",
  ep: "ep",
  single: "single",
  compile: "compilation",
};

function parseYear(date: string | undefined): number | undefined {
  const year = Number(date?.slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : undefined;
}

function pickCover(item: {
  cover_medium?: string | null;
  cover_big?: string | null;
  cover_xl?: string | null;
}) {
  return {
    coverUrl: item.cover_xl || item.cover_big || item.cover_medium || "",
    // cover_big (500px) rather than cover_medium (250px) so grid thumbs stay sharp on 2x screens
    coverThumbUrl: item.cover_big || item.cover_medium || item.cover_xl || "",
  };
}

/**
 * Preview URLs from Deezer are signed and expire within minutes, so cached album data must not
 * carry them. Point at our own route, which resolves a fresh URL on demand.
 */
export function deezerPreviewPath(trackId: string): string {
  return `/api/preview/dz/${trackId}`;
}

export function mapDeezerSearch(body: DeezerSearch): AlbumSummary[] {
  return body.data.map((item) => ({
    source: "dz",
    id: String(item.id),
    title: item.title,
    artist: item.artist.name,
    coverThumbUrl: pickCover(item).coverThumbUrl,
    trackCount: item.nb_tracks,
    recordType: item.record_type ? RECORD_TYPES[item.record_type] : undefined,
  }));
}

/** Below this many albums/EPs, singles stay in the discography so it isn't nearly empty. */
const MIN_FULL_RELEASES = 3;

/** An artist's releases, most popular first — the record people search an artist for is usually near the top. */
export function mapDeezerArtistAlbums(body: DeezerArtistAlbums, artist: string): AlbumSummary[] {
  const albums = body.data.map((item) => ({
    fans: item.fans ?? 0,
    summary: {
      source: "dz",
      id: String(item.id),
      title: item.title,
      artist,
      year: parseYear(item.release_date),
      coverThumbUrl: pickCover(item).coverThumbUrl,
      recordType: item.record_type ? RECORD_TYPES[item.record_type] : undefined,
    } satisfies AlbumSummary,
  }));
  const full = albums.filter((a) => a.summary.recordType !== "single");
  return (full.length >= MIN_FULL_RELEASES ? full : albums)
    .sort((a, b) => b.fans - a.fans)
    .map((a) => a.summary);
}

export function mapDeezerTracks(tracks: DeezerTrack[]): Track[] {
  return [...tracks]
    .sort((a, b) => a.disk_number - b.disk_number || a.track_position - b.track_position)
    .map((t, i) => ({
      id: String(t.id),
      position: i + 1,
      disc: t.disk_number,
      title: t.title,
      durationSec: t.duration,
      previewUrl: t.preview ? deezerPreviewPath(String(t.id)) : undefined,
      explicit: t.explicit_lyrics,
    }));
}

export function mapDeezerAlbum(album: DeezerAlbum, tracks: DeezerTrack[]): Album {
  return {
    source: "dz",
    id: String(album.id),
    title: album.title,
    artist: album.artist.name,
    year: parseYear(album.release_date),
    ...pickCover(album),
    genre: album.genres?.data[0]?.name,
    recordType: album.record_type ? RECORD_TYPES[album.record_type] : undefined,
    tracks: mapDeezerTracks(tracks),
    externalUrl: album.link,
  };
}

// --- Fetching ---

async function deezerGet<S extends z.ZodType>(
  url: string,
  schema: S,
  revalidate: number | false,
): Promise<z.infer<S>> {
  const body = await fetchJson(url, revalidate);
  const err = DeezerErrorSchema.safeParse(body);
  if (err.success) {
    const { code, message } = err.data.error;
    if (code === 800) throw new ProviderError("not_found", `Deezer: ${message}`);
    if (code === 4) throw new ProviderError("rate_limited", `Deezer: ${message}`);
    throw new ProviderError("upstream", `Deezer error ${code}: ${message}`);
  }
  return parseResponse(schema, body);
}

async function getAllTracks(albumId: string): Promise<DeezerTrack[]> {
  const tracks: DeezerTrack[] = [];
  let url: string | undefined = `${BASE}/album/${albumId}/tracks?limit=${TRACKS_PAGE_SIZE}`;
  for (let page = 0; url && page < MAX_TRACK_PAGES; page++) {
    const body: DeezerTracksPage = await deezerGet(url, DeezerTracksPageSchema, REVALIDATE.album);
    tracks.push(...body.data);
    // Only follow pagination links that stay on the Deezer API.
    url = body.next && new URL(body.next).origin === BASE ? body.next : undefined;
  }
  return tracks;
}

function assertNumericId(id: string): void {
  if (!/^\d{1,20}$/.test(id)) throw new ProviderError("not_found", "Invalid Deezer id");
}

export interface ArtistAlbums {
  name: string;
  albums: AlbumSummary[];
}

export const deezer: MusicProvider & {
  getFreshPreviewUrl(trackId: string): Promise<string>;
  searchArtistAlbums(query: string): Promise<ArtistAlbums | null>;
} = {
  id: "dz",

  async searchAlbums(query: string): Promise<AlbumSummary[]> {
    const url = `${BASE}/search/album?q=${encodeURIComponent(query)}&limit=20`;
    return mapDeezerSearch(await deezerGet(url, DeezerSearchSchema, REVALIDATE.search));
  },

  /**
   * The full discography when the query is exactly an artist's name. Album search caps at 20
   * results and mixes in other artists, so an artist's best-known record can be missing from it.
   */
  async searchArtistAlbums(query: string): Promise<ArtistAlbums | null> {
    const found = await deezerGet(
      `${BASE}/search/artist?q=${encodeURIComponent(query)}&limit=1`,
      DeezerArtistSearchSchema,
      REVALIDATE.search,
    );
    const artist = found.data[0];
    if (!artist || !isSameName(query, artist.name)) return null;
    const body = await deezerGet(
      `${BASE}/artist/${artist.id}/albums?limit=100`,
      DeezerArtistAlbumsSchema,
      REVALIDATE.search,
    );
    const albums = mapDeezerArtistAlbums(body, artist.name);
    return albums.length > 0 ? { name: artist.name, albums } : null;
  },

  async getAlbum(id: string): Promise<Album> {
    assertNumericId(id);
    // The tracks embedded in /album/{id} stop at 25 and lack disc numbers — fetch them separately.
    const [album, tracks] = await Promise.all([
      deezerGet(`${BASE}/album/${id}`, DeezerAlbumSchema, REVALIDATE.album),
      getAllTracks(id),
    ]);
    return mapDeezerAlbum(album, tracks);
  },

  /** Signed preview URL, valid for a few minutes. Never cached. */
  async getFreshPreviewUrl(trackId: string): Promise<string> {
    assertNumericId(trackId);
    const track = await deezerGet(`${BASE}/track/${trackId}`, DeezerTrackSchema, false);
    if (!track.preview) throw new ProviderError("not_found", "No preview for this track");
    return track.preview;
  },
};
