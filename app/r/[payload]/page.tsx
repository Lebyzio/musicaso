import type { Metadata } from "next";
import { AlbumLoadError } from "@/components/review/album-load-error";
import { BrokenLink } from "@/components/share/broken-link";
import { SharedReview } from "@/components/share/shared-review";
import { getPageAccent } from "@/lib/accent";
import { isCardTheme } from "@/lib/card/themes";
import { type Dictionary, getDictionary, isLocale } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { loadAlbum } from "@/lib/music";
import type { Album } from "@/lib/music/types";
import { formatScore } from "@/lib/score";
import { decodePayload, encodePayload } from "@/lib/share/codec";
import type { ReviewPayload } from "@/lib/share/schema";
import { type ReviewView, reviewView } from "@/lib/share/review-view";

function reviewTitle(album: Album, view: ReviewView, t: Dictionary): string {
  const verdict = view.verdict ? t.verdict[view.verdict] : "";
  return t.meta.reviewTitle(view.name, album.title, formatScore(view.score), verdict);
}

/** Link previews speak the reviewer's language (the payload's), not the crawler's. */
function payloadDictionary(payload: ReviewPayload): Dictionary {
  return getDictionary(isLocale(payload.l) ? payload.l : "en");
}

export async function generateMetadata({ params }: PageProps<"/r/[payload]">): Promise<Metadata> {
  const { payload } = await params;
  const decoded = decodePayload(payload);
  if (!decoded.ok) {
    return { title: (await getT()).meta.brokenTitle, robots: { index: false } };
  }
  const t = payloadDictionary(decoded.payload);
  const result = await loadAlbum(decoded.payload.s, decoded.payload.a);
  if (!result.ok) return { title: t.meta.reviewFallback, robots: { index: false } };

  const { album } = result;
  const view = reviewView(album, decoded.payload);
  const title = reviewTitle(album, view, t);
  const description =
    view.text ??
    t.meta.reviewDescription(view.name, album.title, album.artist, formatScore(view.score));
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharedReviewPage({ params }: PageProps<"/r/[payload]">) {
  const { payload } = await params;
  const decoded = decodePayload(payload);
  if (!decoded.ok) return <BrokenLink reason={decoded.reason} />;

  const { s, a } = decoded.payload;
  const result = await loadAlbum(s, a);
  if (!result.ok) {
    return result.code === "not_found" ? (
      <BrokenLink reason="album_gone" />
    ) : (
      <AlbumLoadError code={result.code} />
    );
  }

  const view = reviewView(result.album, decoded.payload);
  const t = await getT();
  const accent = await getPageAccent(result.album.coverUrl);
  const canonical = encodePayload(decoded.payload);
  return (
    <SharedReview
      accent={accent}
      album={result.album}
      view={view}
      title={reviewTitle(result.album, view, t)}
      reviewItHref={`/album/${s}/${a}?from=${encodeURIComponent(canonical)}`}
      reviewPath={`/r/${canonical}`}
      cardTheme={isCardTheme(decoded.payload.th) ? decoded.payload.th : "sleeve"}
    />
  );
}
