import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlbumAccent } from "@/components/review/album-accent";
import { AlbumHeader } from "@/components/review/album-header";
import { AlbumLoadError } from "@/components/review/album-load-error";
import { ReviewEditor } from "@/components/review/review-editor";
import { loadAlbum } from "@/lib/music";
import { decodePayload } from "@/lib/share/codec";
import { decodeRatings, fitRatings } from "@/lib/share/ratings";

export async function generateMetadata({
  params,
}: PageProps<"/album/[source]/[id]">): Promise<Metadata> {
  const { source, id } = await params;
  const result = await loadAlbum(source, id);
  if (!result.ok) return { title: "Album" };
  const { title, artist } = result.album;
  return {
    title: `${title} — ${artist}`,
    description: `Rate ${title} by ${artist} track by track and share your verdict.`,
  };
}

/** "Review it yourself": the review being answered, if `?from=` is a valid payload for this album. */
function referenceFrom(
  from: string | string[] | undefined,
  source: string,
  id: string,
  trackCount: number,
) {
  const decoded = decodePayload(typeof from === "string" ? from : undefined);
  if (!decoded.ok || decoded.payload.s !== source || decoded.payload.a !== id) return undefined;
  return {
    name: decoded.payload.n,
    ratings: fitRatings(decodeRatings(decoded.payload.r) ?? [], trackCount),
  };
}

export default async function AlbumPage({
  params,
  searchParams,
}: PageProps<"/album/[source]/[id]">) {
  const [{ source, id }, { from }] = await Promise.all([params, searchParams]);
  const result = await loadAlbum(source, id);
  if (!result.ok) {
    if (result.code === "not_found") notFound();
    return <AlbumLoadError code={result.code} />;
  }
  const { album } = result;

  return (
    <div className="flex flex-col gap-10 pb-24">
      <AlbumAccent coverUrl={album.coverThumbUrl} />
      <AlbumHeader album={album} />
      <ReviewEditor
        album={album}
        reference={referenceFrom(from, source, id, album.tracks.length)}
      />
    </div>
  );
}
