"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import { scoreTone } from "@/components/review/score-tone";
import type { LibraryEntry } from "@/lib/draft";
import { formatScore, verdict } from "@/lib/score";
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

  return (
    <section className="flex flex-col gap-3" aria-labelledby="library-count">
      <p id="library-count" className="text-xs tracking-[0.15em] text-paper-mute uppercase tabular">
        {t.library.count(entries.length)}
      </p>
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <LibraryRow key={`${entry.source}:${entry.id}`} entry={entry} />
        ))}
      </ul>
    </section>
  );
}

function LibraryRow({ entry }: { entry: LibraryEntry }) {
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
    <li className="group relative flex items-center gap-4 rounded-xl border border-ink-800 bg-ink-900/60 p-3 transition-colors hover:border-ink-600 sm:p-4">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-ink-800 sm:size-20">
        {entry.album?.cover && (
          <Image src={entry.album.cover} alt="" fill sizes="80px" className="object-cover" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* The whole row opens the album; the remove button sits above this link. */}
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
    </li>
  );
}
