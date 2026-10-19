"use client";

import { useEffect, useState } from "react";
import type { Track } from "@/lib/music/types";
import { type AlbumStats, formatScore, roundScore, type Verdict } from "@/lib/score";
import { AnimatedNumber } from "../ui/animated-number";
import { scoreTone } from "./score-tone";

export interface ScoreSummary {
  score: number | null;
  verdict: Verdict | null;
  stats: AlbumStats;
}

const formatLive = (n: number) => roundScore(n).toFixed(1);

export function ScoreNumber({ score, className }: { score: number | null; className?: string }) {
  if (score === null) return <span className={className}>–</span>;
  return <AnimatedNumber value={score} format={formatLive} className={className} />;
}

function Progress({ stats }: { stats: AlbumStats }) {
  const done = stats.scored + stats.skipped;
  const pct = stats.total ? (done / stats.total) * 100 : 0;
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-1.5 overflow-hidden rounded-full bg-ink-800"
        role="progressbar"
        aria-label="Tracks rated"
        aria-valuemin={0}
        aria-valuemax={stats.total}
        aria-valuenow={done}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out-expo"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-paper-mute tabular">
        {stats.scored} of {stats.total} rated
        {stats.skipped > 0 && ` · ${stats.skipped} skipped`}
      </p>
    </div>
  );
}

interface ScorePanelProps {
  tracks: Track[];
  summary: ScoreSummary;
  weighted: boolean;
  onToggleWeighted: () => void;
  onClearAll: () => void;
  saveFailed: boolean;
  reference?: { name: string; score: number | null };
}

export function ScorePanel({
  tracks,
  summary,
  weighted,
  onToggleWeighted,
  onClearAll,
  saveFailed,
  reference,
}: ScorePanelProps) {
  const { score, verdict, stats } = summary;
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!confirmClear) return;
    const id = setTimeout(() => setConfirmClear(false), 4000);
    return () => clearTimeout(id);
  }, [confirmClear]);

  const pick = (p: AlbumStats["highest"]) =>
    p && (
      <>
        <span className="line-clamp-1 text-paper">{tracks[p.index]?.title}</span>
        <span className={`font-mono tabular ${scoreTone(p.score)}`}>{formatScore(p.score)}</span>
      </>
    );

  return (
    <div className="flex flex-col gap-6 rounded-card border border-ink-700 bg-ink-900/70 p-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs tracking-[0.25em] text-paper-mute uppercase">Album score</p>
        <div className="flex items-baseline justify-between gap-4">
          <ScoreNumber
            score={score}
            className="font-mono text-7xl leading-none font-medium text-accent tabular"
          />
          <span className="font-display text-2xl text-paper-dim italic" aria-live="polite">
            {verdict ?? "Unrated"}
          </span>
        </div>
      </div>

      <Progress stats={stats} />

      {reference && (
        <p className="flex items-baseline justify-between gap-3 text-sm text-paper-dim">
          <span className="line-clamp-1">{reference.name}’s score</span>
          <span
            className={`font-mono tabular ${reference.score === null ? "text-paper-mute" : scoreTone(reference.score)}`}
          >
            {formatScore(reference.score)}
          </span>
        </p>
      )}

      {stats.scored > 0 && (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-2 text-sm">
          <dt className="text-paper-mute">Best</dt>
          {pick(stats.highest)}
          {stats.scored > 1 && (
            <>
              <dt className="text-paper-mute">Weakest</dt>
              {pick(stats.lowest)}
            </>
          )}
          <dt className="text-paper-mute">8+</dt>
          <dd className="col-span-2 text-paper">
            {stats.atLeast8} {stats.atLeast8 === 1 ? "track" : "tracks"}
          </dd>
          {stats.consistency && (
            <>
              <dt className="text-paper-mute">Flow</dt>
              <dd className="col-span-2 text-paper">{stats.consistency}</dd>
            </>
          )}
        </dl>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={weighted}
        onClick={onToggleWeighted}
        className="group flex items-center justify-between gap-3 text-left text-sm text-paper-dim"
      >
        <span>
          Weight by track length
          <span className="block text-xs text-paper-mute">Long songs count for more</span>
        </span>
        <span className="relative h-6 w-10 shrink-0 rounded-full bg-ink-700 transition-colors group-aria-checked:bg-accent">
          <span className="absolute top-1 left-1 size-4 rounded-full bg-paper transition-transform group-aria-checked:translate-x-4 group-aria-checked:bg-accent-ink" />
        </span>
      </button>

      <div className="flex items-center justify-between gap-3 border-t border-ink-700 pt-4 text-xs text-paper-mute">
        <span>
          {saveFailed ? "Couldn’t save a draft in this browser" : "Draft saved in this browser"}
        </span>
        {stats.scored + stats.skipped > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirmClear) {
                onClearAll();
                setConfirmClear(false);
              } else {
                setConfirmClear(true);
              }
            }}
            className={`rounded-full px-3 py-1 transition-colors ${
              confirmClear
                ? "bg-score-low text-ink-950"
                : "text-paper-mute hover:bg-ink-800 hover:text-paper"
            }`}
          >
            {confirmClear ? "Tap again to clear" : "Clear all"}
          </button>
        )}
      </div>
    </div>
  );
}

/** Compact score shown pinned to the bottom of small screens while the full panel is off-screen. */
export function MobileScoreBar({ summary, hidden }: { summary: ScoreSummary; hidden: boolean }) {
  const { score, verdict, stats } = summary;
  return (
    <div
      aria-hidden={hidden}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-ink-700 bg-ink-950/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 lg:hidden ${
        hidden ? "translate-y-full" : ""
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="font-display text-lg text-paper-dim italic">{verdict ?? "Unrated"}</span>
          <span className="text-xs text-paper-mute tabular">
            {stats.scored} of {stats.total} rated
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="#share"
            tabIndex={hidden ? -1 : undefined}
            className="rounded-full border border-ink-600 px-3 py-1.5 text-xs text-paper-dim"
          >
            Share
          </a>
          <ScoreNumber
            score={score}
            className="font-mono text-4xl font-medium text-accent tabular"
          />
        </div>
      </div>
    </div>
  );
}
