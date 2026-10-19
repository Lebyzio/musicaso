import { jsonError } from "@/lib/api-response";
import { loadAlbum, PROVIDER_ERROR_STATUS } from "@/lib/music";
import type { AlbumSummary } from "@/lib/music/types";

/**
 * Album details without the tracklist, for client code that only has an id (the review library
 * filling in drafts saved before album details were stored).
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/album/[source]/[id]">) {
  const { source, id } = await ctx.params;
  const result = await loadAlbum(source, decodeURIComponent(id));
  if (!result.ok) {
    return jsonError(result.code, "Could not load the album", PROVIDER_ERROR_STATUS[result.code]);
  }
  const { album } = result;
  const summary: AlbumSummary = {
    source: album.source,
    id: album.id,
    title: album.title,
    artist: album.artist,
    year: album.year,
    coverThumbUrl: album.coverThumbUrl,
    trackCount: album.tracks.length,
    recordType: album.recordType,
  };
  return Response.json(summary, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
