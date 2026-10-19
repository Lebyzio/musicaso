import { ProviderError } from "./errors";
import { deezer } from "./providers/deezer";
import { itunes } from "./providers/itunes";
import type { AlbumSummary, MusicProvider } from "./types";

const providers = { dz: deezer, it: itunes } satisfies Record<string, MusicProvider>;

export type ActiveSourceId = keyof typeof providers;

export function isActiveSource(source: string): source is ActiveSourceId {
  return Object.hasOwn(providers, source);
}

export function getProvider(source: ActiveSourceId): MusicProvider {
  return providers[source];
}

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
