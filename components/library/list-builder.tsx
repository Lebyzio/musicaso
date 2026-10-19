"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import { CopyLinkButton, NativeShareButton } from "@/components/share/share-actions";
import type { LibraryEntry } from "@/lib/draft";
import { LIST_MAX, LIST_TITLE_MAX, NAME_MAX } from "@/lib/share/limits";
import { buildList, fitListUrl } from "@/lib/share/list-encode";

const subscribeNever = () => () => {};

export const entryKey = (e: { source: string; id: string }) => `${e.source}:${e.id}`;

/** Can go in a list: we know what the album is and at least one track is scored. */
export function isPickable(entry: LibraryEntry): boolean {
  return entry.album !== null && entry.ratings.some((r) => typeof r === "number");
}

const FIELD =
  "w-full rounded-xl border border-ink-700 bg-ink-950 px-3 py-2 text-paper placeholder:text-paper-mute focus:border-accent focus:outline-none focus-visible:outline-none";

const ICON_BUTTON =
  "flex size-8 items-center justify-center rounded-full text-paper-mute transition-colors hover:bg-ink-800 hover:text-paper disabled:opacity-30 disabled:hover:bg-transparent";

interface ListBuilderProps {
  /** Picked entries, in list order (#1 first). */
  ordered: LibraryEntry[];
  title: string;
  name: string;
  onTitle: (value: string) => void;
  onName: (value: string) => void;
  onMove: (index: number, by: -1 | 1) => void;
  onRemove: (entry: LibraryEntry) => void;
  /** Present while the order is manual; puts it back to best score first. */
  onSortByScore?: () => void;
}

/** The list being built: title, author, order, and the share link. */
export function ListBuilder({
  ordered,
  title,
  name,
  onTitle,
  onName,
  onMove,
  onRemove,
  onSortByScore,
}: ListBuilderProps) {
  const t = useT();
  const locale = useLocale();
  const origin = useSyncExternalStore(
    subscribeNever,
    () => window.location.origin,
    () => "",
  );

  const fit = useMemo(() => {
    if (!origin || ordered.length === 0) return null;
    const payload = buildList({
      name,
      title,
      locale,
      items: ordered.map((e) => ({
        source: e.source as "dz" | "it" | "mb",
        albumId: e.id,
        ratings: e.ratings,
        weighted: e.weighted,
      })),
    });
    return fitListUrl(origin, payload);
  }, [origin, ordered, name, title, locale]);

  const getUrl = () => fit?.url ?? "";
  const unavailable = !fit || fit.tooLong;

  return (
    <section
      aria-labelledby="builder-heading"
      className="flex flex-col gap-5 rounded-card border border-accent/40 bg-ink-900/80 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="builder-heading" className="font-display text-2xl text-paper">
          {t.list.builder.heading}
        </h2>
        <span className="font-mono text-sm text-paper-mute tabular">
          {t.list.builder.count(ordered.length, LIST_MAX)}
        </span>
      </div>
      <p className="text-sm text-paper-dim">{t.list.builder.hint(LIST_MAX)}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm text-paper-dim">
          {t.list.builder.title}
          <input
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            maxLength={LIST_TITLE_MAX}
            className={FIELD}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-paper-dim">
          {t.list.builder.name}
          <input
            value={name}
            onChange={(e) => onName(e.target.value)}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            placeholder={t.share.optional}
            className={FIELD}
          />
        </label>
      </div>

      {ordered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-700 p-4 text-sm text-paper-mute">
          {t.list.builder.empty}
        </p>
      ) : (
        <ol className="flex flex-col gap-1">
          {ordered.map((entry, i) => {
            const albumTitle = entry.album?.title ?? entry.id;
            return (
              <li
                key={entryKey(entry)}
                className="flex items-center gap-3 rounded-lg bg-ink-950/60 px-3 py-1.5"
              >
                <span className="w-6 text-right font-display text-lg text-accent tabular">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-paper">{albumTitle}</span>
                <button
                  type="button"
                  onClick={() => onMove(i, -1)}
                  disabled={i === 0}
                  aria-label={t.list.builder.moveUp(albumTitle)}
                  className={ICON_BUTTON}
                >
                  <span aria-hidden>↑</span>
                </button>
                <button
                  type="button"
                  onClick={() => onMove(i, 1)}
                  disabled={i === ordered.length - 1}
                  aria-label={t.list.builder.moveDown(albumTitle)}
                  className={ICON_BUTTON}
                >
                  <span aria-hidden>↓</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(entry)}
                  aria-label={t.list.builder.remove(albumTitle)}
                  className={ICON_BUTTON}
                >
                  <span aria-hidden>×</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {onSortByScore && (
        <button
          type="button"
          onClick={onSortByScore}
          className="self-start text-xs text-paper-dim underline decoration-ink-600 underline-offset-4 hover:text-paper hover:decoration-accent"
        >
          {t.list.builder.sortByScore}
        </button>
      )}

      {fit?.truncated && !fit.tooLong && (
        <p role="status" className="text-xs text-score-mid">
          {t.list.builder.truncated}
        </p>
      )}
      {fit?.tooLong && (
        <p role="status" className="text-xs text-score-low">
          {t.list.builder.tooLong}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <CopyLinkButton getUrl={getUrl} disabled={unavailable} />
        <NativeShareButton getUrl={getUrl} title={title} disabled={unavailable} />
        {fit && !fit.tooLong && (
          <a
            href={fit.url}
            target="_blank"
            rel="noopener"
            className="rounded-full px-4 py-2.5 text-sm text-paper-dim underline decoration-ink-600 underline-offset-4 hover:text-paper hover:decoration-accent"
          >
            {t.list.builder.openList}
          </a>
        )}
      </div>
    </section>
  );
}
