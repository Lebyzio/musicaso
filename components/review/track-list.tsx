"use client";

import { usePrefersReducedMotion } from "@/components/ui/use-reduced-motion";
import { Fragment, type KeyboardEvent, useCallback, useEffect, useRef } from "react";
import type { Track } from "@/lib/music/types";
import type { Rating } from "@/lib/score";
import type { EditorAction } from "./editor-state";
import type { Reference } from "./share-panel";
import { usePreviewPlayer } from "./preview-player";
import { TrackRow } from "./track-row";

/** After "1", wait this long for a "0" (→ 10) before moving to the next track. */
const TEN_WINDOW_MS = 600;

interface TrackListProps {
  tracks: Track[];
  ratings: Rating[];
  active: number;
  dispatch: (action: EditorAction) => void;
  reference?: Reference;
}

export function TrackList({ tracks, ratings, active, dispatch, reference }: TrackListProps) {
  const sliders = useRef<(HTMLInputElement | null)[]>([]);
  const pendingOne = useRef<{ index: number; timer: number } | null>(null);
  const reduced = usePrefersReducedMotion();
  const { toggle } = usePreviewPlayer();
  const multiDisc = tracks.length > 0 && tracks.some((t) => t.disc !== tracks[0].disc);

  // Keep the latest values reachable from stable callbacks so memoised rows don't re-render.
  const latest = useRef({ tracks, ratings, toggle });
  useEffect(() => {
    latest.current = { tracks, ratings, toggle };
  });
  useEffect(() => () => window.clearTimeout(pendingOne.current?.timer), []);

  const focusTrack = useCallback(
    (index: number) => {
      const last = latest.current.tracks.length - 1;
      const target = Math.min(last, Math.max(0, index));
      dispatch({ type: "focus", index: target });
      const el = sliders.current[target];
      if (!el) return;
      el.focus({ preventScroll: true });
      el.closest("li")?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
    },
    [dispatch, reduced],
  );

  const quickScore = useCallback(
    (index: number, score: number) => {
      const pending = pendingOne.current;
      if (pending) {
        window.clearTimeout(pending.timer);
        pendingOne.current = null;
        if (pending.index === index && score === 0) {
          dispatch({ type: "set", index, value: 20 });
          focusTrack(index + 1);
          return;
        }
      }
      dispatch({ type: "set", index, value: score * 2 });
      if (score === 1) {
        pendingOne.current = {
          index,
          timer: window.setTimeout(() => {
            pendingOne.current = null;
            focusTrack(index + 1);
          }, TEN_WINDOW_MS),
        };
      } else {
        focusTrack(index + 1);
      }
    },
    [dispatch, focusTrack],
  );

  const onKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const { tracks, ratings, toggle } = latest.current;
      const key = e.key;
      if (key === "ArrowUp" || key === "ArrowDown") {
        e.preventDefault(); // otherwise the range input changes its value
        focusTrack(index + (key === "ArrowDown" ? 1 : -1));
      } else if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        quickScore(index, Number(key));
      } else if (key === "s" || key === "S") {
        e.preventDefault();
        dispatch({ type: "toggleSkip", index });
        // Skipping is a decision like scoring, so move on; un-skipping stays put.
        if (ratings[index] !== "skip") focusTrack(index + 1);
      } else if (key === "p" || key === "P") {
        e.preventDefault();
        toggle(tracks[index]);
      } else if (key === "Backspace" || key === "Delete") {
        e.preventDefault();
        dispatch({ type: "clear", index });
      } else if (ratings[index] === "skip" && key.startsWith("Arrow")) {
        e.preventDefault();
      }
    },
    [dispatch, focusTrack, quickScore],
  );

  const registerSlider = useCallback((index: number, el: HTMLInputElement | null) => {
    sliders.current[index] = el;
  }, []);

  const onQuickPick = useCallback(
    (index: number, score: number) => {
      dispatch({ type: "set", index, value: score * 2 });
      focusTrack(index + 1);
    },
    [dispatch, focusTrack],
  );

  return (
    <ol className="flex flex-col gap-1" aria-label="Tracklist">
      {tracks.map((track, i) => (
        <Fragment key={track.id}>
          {multiDisc && (i === 0 || tracks[i - 1].disc !== track.disc) && (
            <li
              role="presentation"
              className="px-3 pt-6 pb-2 text-xs tracking-[0.25em] text-accent uppercase first:pt-0 sm:px-4"
            >
              Disc {track.disc}
            </li>
          )}
          <TrackRow
            track={track}
            index={i}
            rating={ratings[i]}
            active={i === active}
            dispatch={dispatch}
            onKeyDown={onKeyDown}
            onQuickPick={onQuickPick}
            registerSlider={registerSlider}
            refRating={reference ? (reference.ratings[i] ?? null) : undefined}
            refName={reference?.name ?? "Them"}
          />
        </Fragment>
      ))}
    </ol>
  );
}
