import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { coverTransitionName } from "@/lib/music/cover";
import type { AlbumSummary, RecordType } from "@/lib/music/types";

const RECORD_TYPE_LABEL: Partial<Record<RecordType, string>> = {
  ep: "EP",
  single: "Single",
  compilation: "Compilation",
};

export function AlbumCard({
  album,
  priority = false,
}: {
  album: AlbumSummary;
  priority?: boolean;
}) {
  const badge = album.recordType ? RECORD_TYPE_LABEL[album.recordType] : undefined;
  const meta = [
    album.year,
    album.trackCount ? `${album.trackCount} ${album.trackCount === 1 ? "track" : "tracks"}` : null,
  ].filter(Boolean);

  return (
    <Link
      href={`/album/${album.source}/${album.id}`}
      className="group flex flex-col gap-3 rounded-card outline-offset-4"
    >
      {/* Morphs into the album page header cover on navigation. */}
      <ViewTransition name={coverTransitionName(album)} share="morph" default="none">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-ink-800 shadow-lg ring-1 shadow-black/40 ring-white/5">
          {album.coverThumbUrl ? (
            <Image
              src={album.coverThumbUrl}
              alt=""
              fill
              priority={priority}
              sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-[1.04] group-focus-visible:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full items-center justify-center font-display text-4xl text-ink-600 italic">
              ♪
            </div>
          )}
          {badge && (
            <span className="absolute top-2 left-2 rounded-full bg-ink-950/80 px-2 py-0.5 text-[0.65rem] font-medium tracking-wider text-paper uppercase backdrop-blur">
              {badge}
            </span>
          )}
        </div>
      </ViewTransition>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 className="line-clamp-2 leading-normal font-medium text-paper group-hover:text-accent">
          {album.title}
        </h3>
        <p className="line-clamp-1 text-sm leading-normal text-paper-dim">{album.artist}</p>
        {meta.length > 0 && (
          <p className="text-xs leading-normal text-paper-mute tabular">{meta.join(" · ")}</p>
        )}
      </div>
    </Link>
  );
}
