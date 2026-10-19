import { cache } from "react";
import { type ProviderErrorCode, ProviderError } from "./errors";
import { deezer } from "./providers/deezer";
import { itunes } from "./providers/itunes";
import type { Album, AlbumSummary, MusicProvider } from "./types";

const providers = { dz: deezer, it: itunes } satisfies Record<string, MusicProvider>;

export type ActiveSourceId = keyof typeof providers;

export function isActiveSource(source: string): source is ActiveSourceId {
  return Object.hasOwn(providers, source);
}

export function getProvider(source: ActiveSourceId): MusicProvider {
  return providers[source];
}

export type AlbumResult = { ok: true; album: Album } | { ok: false; code: ProviderErrorCode };

/**
 * Load an album for a page render. Memoised per request (generateMetadata + page share one fetch)
 * and never throws for provider failures, so pages can show a specific message.
 */
export const loadAlbum = cache(async (source: string, id: string): Promise<AlbumResult> => {
  if (!isActiveSource(source)) return { ok: false, code: "not_found" };
  try {
    return { ok: true, album: await providers[source].getAlbum(id) };
  } catch (err) {
    if (err instanceof ProviderError) return { ok: false, code: err.code };
    throw err;
  }
});

export interface SearchResult {
  source: ActiveSourceId;
  results: AlbumSummary[];
}

/**
 * Search one source, or — when none is given — Deezer first and Apple Music when Deezer fails
 * or finds nothing. The result says which source actually answered (for attribution).
 */
export async function searchAlbums(query: string, source?: ActiveSourceId): Promise<SearchResult> {
  if (source) return { source, results: await providers[source].searchAlbums(query) };

  let primaryError: unknown;
  try {
    const results = await deezer.searchAlbums(query);
    if (results.length > 0) return { source: "dz", results };
  } catch (err) {
    primaryError = err;
  }

  try {
    return { source: "it", results: await itunes.searchAlbums(query) };
  } catch (err) {
    // Deezer answered (with nothing) — an empty result beats surfacing the fallback's error.
    if (primaryError === undefined) return { source: "dz", results: [] };
    throw primaryError instanceof ProviderError ? primaryError : err;
  }
}

export { ProviderError, PROVIDER_ERROR_STATUS } from "./errors";
export { deezer } from "./providers/deezer";
export { itunes } from "./providers/itunes";
export * from "./types";
