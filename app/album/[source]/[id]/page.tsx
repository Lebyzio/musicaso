import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlbumHeader } from "@/components/review/album-header";
import { AlbumLoadError } from "@/components/review/album-load-error";
import { loadAlbum } from "@/lib/music";
import { formatDuration } from "@/lib/text";

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
      <AlbumHeader album={album} />
      <ol className="flex flex-col divide-y divide-ink-800">
        {album.tracks.map((t) => (
          <li key={t.id} className="flex gap-4 py-3">
            <span className="w-6 text-right text-paper-mute tabular">{t.position}</span>
            <span className="flex-1">{t.title}</span>
            <span className="text-paper-mute tabular">{formatDuration(t.durationSec)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
