import { jsonError, providerErrorResponse } from "@/lib/api-response";
import { deezer } from "@/lib/music";

/**
 * Redirect to a fresh 30-second preview. Deezer's preview URLs are signed and expire within
 * minutes, so album data points here instead of at the MP3 directly. iTunes preview URLs are
 * stable and used as-is, so only `dz` is handled.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/preview/[source]/[trackId]">) {
  const { source, trackId } = await ctx.params;
  if (source !== "dz") return jsonError("not_found", "Previews are only proxied for Deezer", 404);

  try {
    const previewUrl = await deezer.getFreshPreviewUrl(trackId);
    const { protocol, hostname } = new URL(previewUrl);
    if (protocol !== "https:" || !hostname.endsWith(".dzcdn.net")) {
      return jsonError("invalid_response", "Unexpected preview host", 502);
    }
    return new Response(null, {
      status: 302,
      headers: { Location: previewUrl, "Cache-Control": "no-store" },
    });
  } catch (err) {
    return providerErrorResponse(err);
  }
}
