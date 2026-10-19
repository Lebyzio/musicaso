import Image from "next/image";
import Link from "next/link";
import { AlbumAccent } from "@/components/review/album-accent";
import { scoreTone } from "@/components/review/score-tone";
import { ShareActions } from "@/components/share/share-actions";
import { type Accent, accentStyle } from "@/lib/accent";
import { getT } from "@/lib/i18n/server";
import { formatScore } from "@/lib/score";
import type { ListEntryView } from "@/lib/share/list-view";
import { hasThai } from "@/lib/text";
import { SharedListCard } from "./shared-list-card";

interface SharedListProps {
  title: string;
  name: string | undefined;
  entries: ListEntryView[];
  accent: Accent;
  /** Canonical /l/{payload} path, for the image card. */
  listPath: string;
}

export async function SharedList({ title, name, entries, accent, listPath }: SharedListProps) {
  const t = await getT();
  const top = t.image.topN(entries.length);
  const by = name ? t.list.by(name) : null;

  return (
    <div className="flex flex-col gap-10 pt-10 pb-24 sm:pt-16" style={accentStyle(accent)}>
      <AlbumAccent {...accent} />

      <header className="flex flex-col gap-4">
        <p className="text-xs tracking-[0.25em] text-accent uppercase">
          {top}
          {by && (
            <>
              {" · "}
              <span className={hasThai(by) ? "tracking-normal normal-case" : ""}>{by}</span>
            </>
          )}
        </p>
        <h1
          className={`max-w-4xl font-display text-5xl tracking-tight text-balance break-words sm:text-6xl ${
            hasThai(title) ? "leading-[1.3]" : "leading-[1.02]"
          }`}
        >
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <ShareActions reviewItHref="/library" reviewItLabel={t.list.makeYourOwn} title={title} />
        </div>
      </header>

      <ol className="flex flex-col gap-2">
        {entries.map((entry) => (
          <ListRow key={entry.rank} entry={entry} t={t} />
        ))}
      </ol>

      <SharedListCard
        basePath={listPath}
        filenameAlbum={{ title, artist: name ?? "list" }}
        accent={accent.accent}
      />
    </div>
  );
}

function ListRow({ entry, t }: { entry: ListEntryView; t: Awaited<ReturnType<typeof getT>> }) {
  const { album, review } = entry;
  return (
    <li className="group relative grid grid-cols-[2.5rem_4rem_minmax(0,1fr)_auto] items-center gap-x-3 rounded-xl border border-ink-800 bg-ink-900/60 p-3 transition-colors hover:border-ink-600 sm:grid-cols-[3.5rem_5.5rem_minmax(0,1fr)_auto] sm:gap-x-5 sm:p-4">
      <span className="text-right font-display text-3xl text-accent tabular sm:text-4xl">
        {entry.rank}
      </span>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-ink-800">
        {album?.coverThumbUrl && (
          <Image
            src={album.coverThumbUrl}
            alt=""
            fill
            sizes="(min-width: 640px) 88px, 64px"
            loading={entry.rank <= 4 ? "eager" : "lazy"}
            className="object-cover"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        {album ? (
          <>
            {/* The whole row opens the full review. */}
            <Link
              href={entry.reviewPath}
              className="line-clamp-2 font-medium text-paper outline-offset-4 group-hover:text-accent after:absolute after:inset-0 after:rounded-xl"
            >
              {album.title}
            </Link>
            <p className="line-clamp-1 text-sm text-paper-dim">
              {[album.artist, album.year].filter(Boolean).join(" · ")}
            </p>
            <p className="hidden text-xs text-paper-mute sm:block">{t.list.fullReview}</p>
          </>
        ) : (
          <p className="text-sm text-paper-mute">{t.list.missing}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span
          className={`font-mono text-3xl tabular sm:text-4xl ${
            review?.score == null ? "text-paper-mute" : scoreTone(review.score)
          }`}
        >
          {formatScore(review?.score ?? null)}
        </span>
        {review?.verdict && (
          <span className="font-display text-sm text-paper-dim italic">
            {t.verdict[review.verdict]}
          </span>
        )}
      </div>
    </li>
  );
}
