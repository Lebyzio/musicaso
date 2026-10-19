import Image from "next/image";
import { ViewTransition } from "react";
import { coverTransitionName } from "@/lib/music/cover";
import { getT } from "@/lib/i18n/server";
import type { Album } from "@/lib/music/types";
import { SOURCE_LABEL } from "@/lib/music/types";
import { hasThai, splitLength } from "@/lib/text";

export async function AlbumHeader({ album }: { album: Album }) {
  const t = await getT();
  const totalSec = album.tracks.reduce((s, t) => s + t.durationSec, 0);
  const discs = new Set(album.tracks.map((t) => t.disc)).size;
  const meta = [
    album.year,
    album.genre,
    t.album.tracks(album.tracks.length),
    discs > 1 ? t.album.discs(discs) : null,
    totalSec > 0 ? t.album.length(splitLength(totalSec)) : null,
  ].filter(Boolean);

  return (
    <header className="grid items-end gap-6 pt-6 sm:grid-cols-[minmax(0,17rem)_1fr] sm:gap-10 sm:pt-10">
      <div className="relative w-56 sm:w-full">
        <div aria-hidden className="absolute -inset-4 rounded-full bg-accent opacity-25 blur-3xl" />
        <ViewTransition name={coverTransitionName(album)} share="morph" default="none">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-ink-800 shadow-2xl ring-1 shadow-black/60 ring-white/10">
            {album.coverUrl && (
              <Image
                src={album.coverUrl}
                alt={t.album.coverOf(album.title)}
                fill
                // LCP on album and review pages: start the download from <head>, not mid-body.
                preload
                sizes="(min-width: 640px) 17rem, 14rem"
                className="object-cover"
              />
            )}
          </div>
        </ViewTransition>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-xs tracking-[0.25em] text-accent uppercase">
          {t.album.recordType[album.recordType ?? "album"]}
        </p>
        <h1
          className={`font-display text-4xl tracking-tight text-balance break-words sm:text-6xl ${
            hasThai(album.title) ? "leading-[1.35]" : "leading-[1.02]"
          }`}
        >
          {album.title}
        </h1>
        <p className="text-xl text-paper-dim">{album.artist}</p>
        <p className="text-sm text-paper-mute tabular">{meta.join(" · ")}</p>
        {album.externalUrl && (
          <a
            href={album.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit text-xs text-paper-mute underline decoration-ink-600 underline-offset-4 hover:text-paper hover:decoration-accent"
          >
            {t.album.dataFrom(SOURCE_LABEL[album.source])} ↗
          </a>
        )}
      </div>
    </header>
  );
}
