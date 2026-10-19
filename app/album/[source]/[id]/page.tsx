import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlbumAccent } from "@/components/review/album-accent";
import { AlbumHeader } from "@/components/review/album-header";
import { AlbumLoadError } from "@/components/review/album-load-error";
import { ReviewEditor } from "@/components/review/review-editor";
import { loadAlbum } from "@/lib/music";

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

export default async function AlbumPage({ params }: PageProps<"/album/[source]/[id]">) {
  const { source, id } = await params;
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
      <ReviewEditor album={album} />
    </div>
  );
}
