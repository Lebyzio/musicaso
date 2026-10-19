"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import { scoreTone } from "@/components/review/score-tone";
import { type LibraryEntry, loadReviewerName } from "@/lib/draft";
import { formatScore, verdict } from "@/lib/score";
import { LIST_MAX } from "@/lib/share/limits";
import { entryKey, isPickable, ListBuilder } from "./list-builder";
import { removeFromLibrary, useLibrary } from "./use-library";

export function LibraryView() {
  const t = useT();
  const entries = useLibrary();

  if (entries === null) {
    return (
      <ul className="flex animate-pulse flex-col gap-2" aria-busy aria-label={t.library.loading}>
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="h-24 rounded-xl bg-ink-900" />
        ))}
      </ul>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-card border border-ink-700 bg-ink-900/70 p-6">
        <p className="font-display text-2xl text-paper-dim italic">{t.library.emptyTitle}</p>
        <p className="max-w-md text-sm text-paper-mute">{t.library.emptyBody}</p>
        <Link
          href="/"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink"
        >
          {t.library.findAlbum}
        </Link>
      </div>
    );
  }

  return <Library entries={entries} />;
}

/** The loaded library, with the top-list builder. */
function Library({ entries }: { entries: LibraryEntry[] }) {
  const t = useT();
  const [building, setBuilding] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  // Until the user reorders by hand, the list stays sorted best score first.
  const [manual, setManual] = useState(false);
  const [year] = useState(() => new Date().getFullYear());
  const [onlyThisYear, setOnlyThisYear] = useState(false);
  const [title, setTitle] = useState(() => t.list.defaultTitle(year));
  const [name, setName] = useState(loadReviewerName);

  const byKey = useMemo(() => new Map(entries.map((e) => [entryKey(e), e])), [entries]);
  // Picks whose draft was removed (here or in another tab) drop out.
  const ordered = useMemo(() => {
    const list = picked.map((k) => byKey.get(k)).filter((e): e is LibraryEntry => Boolean(e));
    return manual ? list : list.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }, [picked, byKey, manual]);
  const rankOf = new Map(ordered.map((e, i) => [entryKey(e), i + 1]));

  const shown = building && onlyThisYear ? entries.filter((e) => e.album?.year === year) : entries;

  function toggle(entry: LibraryEntry) {
    const key = entryKey(entry);
    // Functional update: quick successive clicks must each see the previous pick.
    setPicked((prev) => {
      const valid = prev.filter((k) => byKey.has(k));
      if (valid.includes(key)) return valid.filter((k) => k !== key);
      return valid.length < LIST_MAX ? [...valid, key] : valid;
    });
  }

  function move(index: number, by: -1 | 1) {
    const keys = ordered.map(entryKey);
    [keys[index], keys[index + by]] = [keys[index + by], keys[index]];
    setPicked(keys);
    setManual(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs tracking-[0.15em] text-paper-mute uppercase tabular">
          {t.library.count(entries.length)}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {building && (
            <label className="flex items-center gap-2 text-sm text-paper-dim">
              <input
                type="checkbox"
                checked={onlyThisYear}
                onChange={(e) => setOnlyThisYear(e.target.checked)}
                className="size-4 accent-accent"
              />
              {t.list.builder.thisYear(year)}
            </label>
          )}
          <button
            type="button"
            onClick={() => setBuilding((v) => !v)}
            aria-expanded={building}
            className={
              building
                ? "rounded-full border border-ink-600 px-4 py-2 text-sm text-paper hover:border-accent"
                : "rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink"
            }
          >
            {building ? t.list.builder.close : t.list.builder.open}
          </button>
        </div>
      </div>

      {building && (
        <ListBuilder
          ordered={ordered}
          title={title}
          name={name}
          onTitle={setTitle}
          onName={setName}
          onMove={move}
          onRemove={toggle}
          onSortByScore={manual ? () => setManual(false) : undefined}
        />
      )}

      {shown.length === 0 ? (
        <p className="text-sm text-paper-mute">{t.list.builder.noneThisYear(year)}</p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label={t.library.title}>
          {shown.map((entry) => (
            <LibraryRow
              key={entryKey(entry)}
              entry={entry}
              pick={
                building
                  ? {
                      rank: rankOf.get(entryKey(entry)),
                      full: ordered.length >= LIST_MAX,
                      onToggle: () => toggle(entry),
                    }
                  : undefined
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface PickProps {
  /** Position in the list being built, if picked. */
  rank: number | undefined;
  full: boolean;
  onToggle: () => void;
}

function LibraryRow({ entry, pick }: { entry: LibraryEntry; pick?: PickProps }) {
  const t = useT();
  const locale = useLocale();
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!confirm) return;
    const id = setTimeout(() => setConfirm(false), 4000);
    return () => clearTimeout(id);
  }, [confirm]);

  const title = entry.album?.title ?? `${entry.source.toUpperCase()} · ${entry.id}`;
  const label = verdict(entry.score);
  const scored = entry.ratings.filter((r) => typeof r === "number").length;
  const date = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    dateStyle: "medium",
  }).format(entry.updatedAt);

  return (
    <li
      className={`group relative flex items-center gap-4 rounded-xl border bg-ink-900/60 p-3 transition-colors hover:border-ink-600 sm:p-4 ${
        pick?.rank ? "border-accent/60" : "border-ink-800"
      }`}
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-ink-800 sm:size-20">
        {entry.album?.cover && (
          <Image src={entry.album.cover} alt="" fill sizes="80px" className="object-cover" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* The whole row opens the album; the buttons sit above this link. */}
        <Link
          href={`/album/${entry.source}/${entry.id}`}
          className="line-clamp-1 font-medium text-paper outline-offset-4 group-hover:text-accent after:absolute after:inset-0 after:rounded-xl"
        >
          {title}
        </Link>
        <p className="line-clamp-1 text-sm text-paper-dim">
          {entry.album
            ? [entry.album.artist, entry.album.year].filter(Boolean).join(" · ")
            : t.library.noDetails}
        </p>
        <p className="text-xs text-paper-mute tabular">
          {t.score.ratedOf(scored, entry.ratings.length)} · {t.library.edited(date)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={`font-mono text-2xl tabular ${entry.score === null ? "text-paper-mute" : scoreTone(entry.score)}`}
        >
          {formatScore(entry.score)}
        </span>
        <span className="font-display text-sm text-paper-dim italic">
          {label ? t.verdict[label] : t.score.unrated}
        </span>
      </div>

      {pick ? (
        <PickButton entry={entry} title={title} {...pick} />
      ) : (
        <button
          type="button"
          onClick={() => {
            if (confirm) removeFromLibrary(entry.source, entry.id);
            else setConfirm(true);
          }}
          aria-label={confirm ? t.library.confirmRemove : t.library.removeLabel(title)}
          className={`relative z-10 shrink-0 rounded-full px-3 py-1.5 text-xs transition-colors ${
            confirm
              ? "bg-score-low text-ink-950"
              : "text-paper-mute hover:bg-ink-800 hover:text-paper"
          }`}
        >
          {confirm ? t.library.confirmRemove : t.library.remove}
        </button>
      )}
    </li>
  );
}

function PickButton({
  entry,
  title,
  rank,
  full,
  onToggle,
}: PickProps & { entry: LibraryEntry; title: string }) {
  const t = useT();
  const pickable = isPickable(entry);
  const blocked = !rank && (full || !pickable);
  const reason = !pickable ? t.list.builder.needsScore : full ? t.list.builder.full(LIST_MAX) : "";
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={blocked}
      aria-pressed={Boolean(rank)}
      aria-label={rank ? t.list.builder.inList(rank) : t.list.builder.add(title)}
      title={blocked ? reason : undefined}
      className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border border-ink-600 font-display text-lg text-paper-dim transition-colors hover:border-accent hover:text-paper disabled:cursor-not-allowed disabled:opacity-30 aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-ink"
    >
      {rank ?? <span aria-hidden>+</span>}
    </button>
  );
}
