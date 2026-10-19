import { z } from "zod";
import { ListCard } from "@/components/card/list-card";
import { getAlbumAccent } from "@/lib/accent";
import { jsonError } from "@/lib/api-response";
import { leadCover, listCardEntries, loadListView } from "@/lib/card/list-entries";
import { CARD_FORMATS, CARD_THEMES, cardPalette } from "@/lib/card/themes";
import { getDictionary, isLocale, LOCALES } from "@/lib/i18n";
import { decodeList } from "@/lib/share/list-codec";
import { pngResponse, renderPng } from "@/lib/render-image";

const Query = z.object({
  format: z.enum(["square", "story"]).default("square"),
  theme: z.enum(CARD_THEMES).default("sleeve"),
  lang: z.enum(LOCALES).optional(),
});

/**
 * PNG card for a top list: /l/{payload}/card?format=square|story&theme=sleeve|paper|vivid&lang=en|th
 * Without ?lang= the card uses the list's own language (payload `l`).
 */
export async function GET(request: Request, ctx: RouteContext<"/l/[payload]/card">) {
  const params = new URL(request.url).searchParams;
  const query = Query.safeParse({
    format: params.get("format") ?? undefined,
    theme: params.get("theme") ?? undefined,
    lang: params.get("lang") ?? undefined,
  });
  if (!query.success) {
    return jsonError(
      "bad_request",
      `Use ?format=square|story, ?theme=${CARD_THEMES.join("|")} and ?lang=${LOCALES.join("|")}`,
      400,
    );
  }

  const { payload } = await ctx.params;
  const decoded = decodeList(payload);
  if (!decoded.ok) return jsonError("not_found", "This list link is broken", 404);

  const list = decoded.payload;
  const { format, theme } = query.data;
  const t = getDictionary(query.data.lang ?? (isLocale(list.l) ? list.l : "en"));
  const view = await loadListView(list);
  const [{ accent }, entries] = await Promise.all([
    getAlbumAccent(leadCover(view)),
    listCardEntries(view, format === "story" ? 106 : 168, t), // drawn sizes, see ListCard
  ]);

  const png = await renderPng(
    <ListCard
      title={list.t ?? t.list.fallbackTitle}
      name={list.n}
      entries={entries}
      format={format}
      palette={cardPalette(theme, accent)}
      t={t}
    />,
    CARD_FORMATS[format],
  );
  return pngResponse(png, {
    // The URL is derived from the list itself, so the image only changes with album data.
    "Cache-Control": "public, max-age=86400, s-maxage=604800",
  });
}
