"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useT } from "@/components/i18n/locale-provider";
import { loadDraft, loadReviewerName, saveDraft, saveReviewerName } from "@/lib/draft";
import type { Album } from "@/lib/music/types";
import { albumScore, albumStats, verdict } from "@/lib/score";
import { editorReducer, initEditor } from "./editor-state";
import { PreviewPlayerProvider } from "./preview-player";
import { MobileScoreBar, ScorePanel, type ScoreSummary } from "./score-panel";
import { type Reference, SharePanel } from "./share-panel";
import { TrackList } from "./track-list";

const AUTOSAVE_MS = 400;

const SHORTCUTS = [
  ["← →", "adjust"],
  ["0–9", "score"],
  ["S", "skip"],
  ["P", "preview"],
  ["↑ ↓", "track"],
] as const;

export function ReviewEditor({
  album,
  reference,
  accent,
}: {
  album: Album;
  reference?: Reference;
  /** Album accent (hex) from the server, for the card theme swatches. */
  accent: string;
}) {
  const t = useT();
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
      name: saved?.name || loadReviewerName(),
      text: saved?.text ?? "",
      theme: saved?.theme,
    });
  }, [source, id, tracks.length]);

  const summary: ScoreSummary = useMemo(() => {
    const score = albumScore(
      state.ratings,
      state.weighted ? tracks.map((t) => t.durationSec) : undefined,
    );
    return { score, verdict: verdict(score), stats: albumStats(state.ratings) };
  }, [state.ratings, state.weighted, tracks]);

  // What the review library (/library) shows for this draft without refetching the album.
  const draftAlbum = useMemo(
    () => ({
      title: album.title,
      artist: album.artist,
      year: album.year,
      cover: album.coverThumbUrl || undefined,
    }),
    [album.title, album.artist, album.year, album.coverThumbUrl],
  );

  useEffect(() => {
    if (!state.loaded) return; // don't overwrite a draft before it has been read
    const timer = setTimeout(() => {
      const ok = saveDraft(source, id, {
        ratings: state.ratings,
        weighted: state.weighted,
        name: state.name,
        text: state.text,
        theme: state.theme,
        album: draftAlbum,
        score: summary.score,
      });
      saveReviewerName(state.name);
      setSaveFailed(!ok);
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [
    state.loaded,
    source,
    id,
    state.ratings,
    state.weighted,
    state.name,
    state.text,
    state.theme,
    draftAlbum,
    summary.score,
  ]);

  const referenceScore = useMemo(
    () => (reference ? albumScore(reference.ratings) : null),
    [reference],
  );
  const referenceName = reference?.name ?? t.editor.originalReviewer;

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
    <PreviewPlayerProvider>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <section aria-labelledby="tracklist-heading" className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3 px-3 sm:px-4">
            <h2
              id="tracklist-heading"
              className="text-xs tracking-[0.25em] text-paper-mute uppercase"
            >
              {t.editor.tracklist}
            </h2>
            <ul
              className="hidden flex-wrap gap-x-4 gap-y-1 text-xs text-paper-mute sm:flex"
              aria-label={t.editor.shortcuts}
            >
              {SHORTCUTS.map(([keys, action]) => (
                <li key={keys}>
                  <kbd className="rounded border border-ink-600 px-1.5 py-0.5 font-mono text-[0.7rem] text-paper-dim">
                    {keys}
                  </kbd>{" "}
                  {t.editor.shortcut[action]}
                </li>
              ))}
            </ul>
          </div>

          {reference && (
            <p
              role="status"
              className="mx-3 rounded-xl border border-ink-700 bg-ink-900 p-4 text-sm text-paper-dim sm:mx-4"
            >
              {t.editor.alongside.before}
              <span className="text-paper">{referenceName}</span>
              {t.editor.alongside.after}
            </p>
          )}

          {state.mismatch && (
            <div
              role="status"
              className="mx-3 flex items-start justify-between gap-4 rounded-xl border border-score-mid/40 bg-score-mid/10 p-4 text-sm text-paper-dim sm:mx-4"
            >
              <p>{t.editor.mismatch}</p>
              <button
                type="button"
                onClick={() => dispatch({ type: "dismissMismatch" })}
                className="shrink-0 text-paper-mute hover:text-paper"
                aria-label={t.editor.dismiss}
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
            reference={reference}
          />
        </section>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start" ref={panelRef}>
          <ScorePanel
            tracks={tracks}
            summary={summary}
            weighted={state.weighted}
            onToggleWeighted={() => dispatch({ type: "toggleWeighted" })}
            onClearAll={() => dispatch({ type: "clearAll" })}
            saveFailed={saveFailed}
            reference={reference && { name: referenceName, score: referenceScore }}
          />
          <SharePanel
            source={source}
            albumId={id}
            albumTitle={album.title}
            albumArtist={album.artist}
            accent={accent}
            theme={state.theme}
            ratings={state.ratings}
            weighted={state.weighted}
            name={state.name}
            text={state.text}
            reference={reference}
            dispatch={dispatch}
          />
        </aside>
      </div>

      <MobileScoreBar summary={summary} hidden={panelVisible} />
    </PreviewPlayerProvider>
  );
}
