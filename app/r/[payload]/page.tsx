import type { Metadata } from "next";
import { AlbumLoadError } from "@/components/review/album-load-error";
import { BrokenLink } from "@/components/share/broken-link";
import { SharedReview } from "@/components/share/shared-review";
import { getPageAccent } from "@/lib/accent";
import { isCardTheme } from "@/lib/card/themes";
import { loadAlbum } from "@/lib/music";
import type { Album } from "@/lib/music/types";
import { formatScore } from "@/lib/score";
import { decodePayload, encodePayload } from "@/lib/share/codec";
import { type ReviewView, reviewView } from "@/lib/share/review-view";

function reviewTitle(album: Album, view: ReviewView): string {
  const lead = view.name ? `${view.name} on` : "A review of";
  const verdict = view.verdict ? ` ${view.verdict}` : "";
  return `${lead} ${album.title} — ${formatScore(view.score)}${verdict}`;
}

export async function generateMetadata({ params }: PageProps<"/r/[payload]">): Promise<Metadata> {
  const { payload } = await params;
  const decoded = decodePayload(payload);
  if (!decoded.ok) return { title: "Broken review link", robots: { index: false } };
  const result = await loadAlbum(decoded.payload.s, decoded.payload.a);
  if (!result.ok) return { title: "Album review", robots: { index: false } };

  const { album } = result;
  const view = reviewView(album, decoded.payload);
  const title = reviewTitle(album, view);
  const description =
    view.text ??
    `${view.name ?? "Someone"} rated ${album.title} by ${album.artist} track by track: ${formatScore(view.score)}/10.`;
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
  const accent = await getPageAccent(result.album.coverUrl);
  const canonical = encodePayload(decoded.payload);
  return (
    <SharedReview
      accent={accent}
      album={result.album}
      view={view}
      title={reviewTitle(result.album, view)}
      reviewItHref={`/album/${s}/${a}?from=${encodeURIComponent(canonical)}`}
      reviewPath={`/r/${canonical}`}
      cardTheme={isCardTheme(decoded.payload.th) ? decoded.payload.th : "sleeve"}
    />
  );
}
