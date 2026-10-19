"use client";

import { type KeyboardEvent, memo } from "react";
import type { Track } from "@/lib/music/types";
import { formatScore, type Rating, toScore } from "@/lib/score";
import { formatDuration } from "@/lib/text";
import type { EditorAction } from "./editor-state";
import { PreviewButton } from "./preview-player";
import { scoreTone } from "./score-tone";

const QUICK_PICKS = Array.from({ length: 11 }, (_, i) => i);
const UNRATED_POSITION = 10;

function valueText(rating: Rating): string {
  if (rating === null) return "Not rated";
  if (rating === "skip") return "Skipped";
  return `${formatScore(toScore(rating))} out of 10`;
}

function shortScore(rating: Rating): string {
  if (rating === null) return "–";
  if (rating === "skip") return "skip";
  return formatScore(toScore(rating));
}

interface TrackRowProps {
  track: Track;
  index: number;
  rating: Rating;
  active: boolean;
  dispatch: (action: EditorAction) => void;
  onKeyDown: (index: number, e: KeyboardEvent<HTMLInputElement>) => void;
  onQuickPick: (index: number, score: number) => void;
  registerSlider: (index: number, el: HTMLInputElement | null) => void;
  /** The earlier reviewer's rating ("Review it yourself"), shown as a ghost. */
  refRating?: Rating;
  refName?: string;
}

export const TrackRow = memo(function TrackRow({
  track,
  index,
  rating,
  active,
  dispatch,
  onKeyDown,
  onQuickPick,
  registerSlider,
  refRating,
  refName,
}: TrackRowProps) {
  const skipped = rating === "skip";
  const scored = typeof rating === "number";
  const inner = active ? 0 : -1; // roving focus: only the active row is in the tab order

  return (
    <li
      onPointerDown={() => dispatch({ type: "focus", index })}
      className={`flex flex-col gap-2 rounded-xl px-3 py-3 transition-colors sm:px-4 ${
        active ? "bg-ink-900 ring-1 ring-accent/40" : "hover:bg-ink-900/60"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="w-6 shrink-0 text-right text-sm text-paper-mute tabular">
          {track.position}
        </span>
        <div className={`min-w-0 flex-1 ${skipped ? "opacity-45" : ""}`}>
          <p className="line-clamp-2 leading-normal font-medium text-paper">{track.title}</p>
          <p className="text-xs text-paper-mute tabular">
            {formatDuration(track.durationSec)}
            {track.explicit && (
              <span className="ml-2 rounded-sm bg-ink-700 px-1 text-[0.6rem] font-semibold text-paper-dim">
                E
              </span>
            )}
          </p>
        </div>
        <PreviewButton track={track} tabIndex={inner} />
        <span className="flex w-14 shrink-0 flex-col items-end" aria-hidden>
          <span
            className={`font-mono text-xl tabular ${
              scored ? scoreTone(toScore(rating)) : "text-paper-mute"
            }`}
          >
            {skipped ? "skip" : scored ? formatScore(toScore(rating)) : "–"}
          </span>
          {refRating !== undefined && (
            <span className="max-w-full truncate text-[0.65rem] text-paper-mute tabular">
              {refName} {shortScore(refRating)}
            </span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-3 pl-9">
        <div className="relative flex min-w-0 flex-1 items-center">
          {typeof refRating === "number" && (
            <span
              aria-hidden
              title={`${refName}: ${valueText(refRating)}`}
              className="pointer-events-none absolute top-0 h-1.5 w-0.5 -translate-x-1/2 rounded-full bg-paper-mute"
              // Native range thumbs are ~16px wide: map 0–20 onto the thumb-centre track.
              style={{ left: `calc(8px + (100% - 16px) * ${refRating / 20})` }}
            />
          )}
          <input
            ref={(el) => registerSlider(index, el)}
            type="range"
            min={0}
            max={20}
            step={1}
            value={scored ? rating : UNRATED_POSITION}
            tabIndex={inner}
            aria-label={`Rating for ${track.title}`}
            aria-valuetext={valueText(rating)}
            aria-disabled={skipped}
            data-track-index={index}
            onFocus={() => dispatch({ type: "focus", index })}
            onChange={(e) => {
              if (!skipped) dispatch({ type: "set", index, value: Number(e.target.value) });
            }}
            // Clicking the thumb of an unrated track at its resting spot fires no change event.
            onClick={(e) => {
              if (rating === null) {
                dispatch({ type: "set", index, value: Number(e.currentTarget.value) });
              }
            }}
            onKeyDown={(e) => onKeyDown(index, e)}
            className={`h-6 w-full min-w-0 cursor-pointer accent-accent ${
              scored ? "" : "opacity-35"
            } ${skipped ? "cursor-not-allowed" : ""}`}
          />
        </div>
        <button
          type="button"
          tabIndex={inner}
          aria-pressed={skipped}
          onClick={() => dispatch({ type: "toggleSkip", index })}
          className="shrink-0 rounded-full border border-ink-600 px-3 py-1 text-xs text-paper-mute transition-colors hover:border-accent hover:text-paper aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-ink"
        >
          {skipped ? "Skipped" : "Skip"}
        </button>
      </div>

      {active && !skipped && (
        <div className="flex justify-between gap-1 pl-9" role="group" aria-label="Quick score">
          {QUICK_PICKS.map((n) => {
            const pressed = scored && rating === n * 2;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={pressed}
                aria-label={`Score ${n}`}
                onClick={() => onQuickPick(index, n)}
                className="flex h-8 min-w-0 flex-1 items-center justify-center rounded-md bg-ink-800 font-mono text-sm text-paper-dim transition-colors hover:bg-ink-700 hover:text-paper aria-pressed:bg-accent aria-pressed:text-accent-ink"
              >
                {n}
              </button>
            );
          })}
        </div>
      )}
    </li>
  );
});
