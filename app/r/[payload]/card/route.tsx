import { z } from "zod";
import { ReviewCard } from "@/components/card/review-card";
import { getAlbumAccent } from "@/lib/accent";
import { jsonError } from "@/lib/api-response";
import { coverDataUri } from "@/lib/cover-image";
import { CARD_FORMATS, CARD_THEMES, cardPalette, isCardTheme } from "@/lib/card/themes";
import { cardTracks } from "@/lib/card/tracks";
import { loadAlbum } from "@/lib/music";
import { decodePayload } from "@/lib/share/codec";
import { pngResponse, renderPng } from "@/lib/render-image";
import { reviewView } from "@/lib/share/review-view";

const Query = z.object({
  format: z.enum(["square", "story"]).default("square"),
  theme: z.enum(CARD_THEMES).optional(),
});

/** PNG card for a shared review: /r/{payload}/card?format=square|story&theme=sleeve|paper|vivid */
export async function GET(request: Request, ctx: RouteContext<"/r/[payload]/card">) {
  const params = new URL(request.url).searchParams;
  const query = Query.safeParse({
    format: params.get("format") ?? undefined,
    theme: params.get("theme") ?? undefined,
  });
  if (!query.success) {
    return jsonError(
      "bad_request",
      "Use ?format=square|story and ?theme=" + CARD_THEMES.join("|"),
      400,
    );
  }

  const { payload } = await ctx.params;
  const decoded = decodePayload(payload);
  if (!decoded.ok) return jsonError("not_found", "This review link is broken", 404);

  const result = await loadAlbum(decoded.payload.s, decoded.payload.a);
  if (!result.ok) {
    return result.code === "not_found"
      ? jsonError("not_found", "Album not found", 404)
      : jsonError(result.code, "Could not load the album", 502);
  }

  const { album } = result;
  const { format } = query.data;
  const theme =
    query.data.theme ?? (isCardTheme(decoded.payload.th) ? decoded.payload.th : "sleeve");
  const [{ accent }, cover] = await Promise.all([
    getAlbumAccent(album.coverUrl),
    coverDataUri(album.coverUrl, format === "story" ? 400 : 300), // drawn size, see ReviewCard
  ]);
  const view = reviewView(album, decoded.payload);

  const png = await renderPng(
    <ReviewCard
      album={album}
      view={view}
      format={format}
      palette={cardPalette(theme, accent)}
      cover={cover}
      tracks={cardTracks(album.tracks, view.ratings, format, view.reference?.ratings)}
    />,
    CARD_FORMATS[format],
  );
  return pngResponse(png, {
    // The URL is derived from the review itself, so the image only changes with album data.
    "Cache-Control": "public, max-age=86400, s-maxage=604800",
  });
}
