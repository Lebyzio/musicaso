"use client";

import { MotionConfig } from "motion/react";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { loadDraft, saveDraft } from "@/lib/draft";
import type { Album } from "@/lib/music/types";
import { albumScore, albumStats, verdict } from "@/lib/score";
import { editorReducer, initEditor } from "./editor-state";
import { PreviewPlayerProvider } from "./preview-player";
import { MobileScoreBar, ScorePanel, type ScoreSummary } from "./score-panel";
import { TrackList } from "./track-list";

const AUTOSAVE_MS = 400;

const SHORTCUTS: [string, string][] = [
  ["← →", "±0.5"],
  ["0–9", "score"],
  ["S", "skip"],
  ["P", "preview"],
  ["↑ ↓", "track"],
];

export function ReviewEditor({ album }: { album: Album }) {
  const { source, id, tracks } = album;
  const [state, dispatch] = useReducer(editorReducer, tracks.length, initEditor);
  const [saveFailed, setSaveFailed] = useState(false);

  // Drafts live in localStorage, so they can only be read after mount.
  useEffect(() => {
    const saved = loadDraft(source, id, tracks.length);
    dispatch({
      type: "hydrate",
      ratings: saved?.ratings ?? [],
      weighted: saved?.weighted ?? false,
      mismatch: saved?.mismatch ?? false,
    });
  }, [source, id, tracks.length]);

  useEffect(() => {
    if (!state.loaded) return; // don't overwrite a draft before it has been read
    const timer = setTimeout(() => {
      const ok = saveDraft(source, id, { ratings: state.ratings, weighted: state.weighted });
      setSaveFailed(!ok);
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [state.loaded, source, id, state.ratings, state.weighted]);

  const summary: ScoreSummary = useMemo(() => {
    const score = albumScore(
      state.ratings,
      state.weighted ? tracks.map((t) => t.durationSec) : undefined,
    );
    return { score, verdict: verdict(score), stats: albumStats(state.ratings) };
  }, [state.ratings, state.weighted, tracks]);

  // Hide the pinned mobile bar while the full panel is on screen.
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelVisible, setPanelVisible] = useState(false);
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setPanelVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <PreviewPlayerProvider>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
          <section aria-labelledby="tracklist-heading" className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3 px-3 sm:px-4">
              <h2
                id="tracklist-heading"
                className="text-xs tracking-[0.25em] text-paper-mute uppercase"
              >
                Tracklist
              </h2>
              <ul
                className="hidden flex-wrap gap-x-4 gap-y-1 text-xs text-paper-mute sm:flex"
                aria-label="Keyboard shortcuts"
              >
                {SHORTCUTS.map(([keys, action]) => (
                  <li key={keys}>
                    <kbd className="rounded border border-ink-600 px-1.5 py-0.5 font-mono text-[0.7rem] text-paper-dim">
                      {keys}
                    </kbd>{" "}
                    {action}
                  </li>
                ))}
              </ul>
            </div>

            {state.mismatch && (
              <div
                role="status"
                className="mx-3 flex items-start justify-between gap-4 rounded-xl border border-score-mid/40 bg-score-mid/10 p-4 text-sm text-paper-dim sm:mx-4"
              >
                <p>
                  This album’s tracklist changed since you started rating it. Your scores were
                  matched by track order — give them a quick check.
                </p>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "dismissMismatch" })}
                  className="shrink-0 text-paper-mute hover:text-paper"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            )}

            <TrackList
              tracks={tracks}
              ratings={state.ratings}
              active={state.active}
              dispatch={dispatch}
            />
          </section>

          <aside className="lg:sticky lg:top-6 lg:self-start" ref={panelRef}>
            <ScorePanel
              tracks={tracks}
              summary={summary}
              weighted={state.weighted}
              onToggleWeighted={() => dispatch({ type: "toggleWeighted" })}
              onClearAll={() => dispatch({ type: "clearAll" })}
              saveFailed={saveFailed}
            />
          </aside>
        </div>

        <MobileScoreBar summary={summary} hidden={panelVisible} />
      </PreviewPlayerProvider>
    </MotionConfig>
  );
}
