"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useT } from "@/components/i18n/locale-provider";
import type { Track } from "@/lib/music/types";

interface PlayerControls {
  playingId: string | null;
  failedIds: ReadonlySet<string>;
  toggle(track: Track): void;
  stop(): void;
}

const ControlsContext = createContext<PlayerControls | null>(null);
// Progress ticks several times a second — kept separate so only the playing button re-renders.
const ProgressContext = createContext(0);

/** One shared <audio> element: starting a preview stops the previous one. */
export function PreviewPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(new Set());

  const audio = useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = "none";
      el.volume = 0.8;
      el.addEventListener("timeupdate", () => {
        setProgress(el.duration ? el.currentTime / el.duration : 0);
      });
      el.addEventListener("ended", () => {
        setPlayingId(null);
        setProgress(0);
      });
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setPlayingId(null);
    setProgress(0);
  }, []);

  const toggle = useCallback(
    (track: Track) => {
      if (!track.previewUrl) return;
      const el = audio();
      if (playingId === track.id) {
        stop();
        return;
      }
      // Deezer previews go through /api/preview/dz/{id}, which redirects to a fresh signed URL.
      el.src = track.previewUrl;
      setPlayingId(track.id);
      setProgress(0);
      el.play().catch((err: unknown) => {
        // AbortError just means another play() replaced this one.
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFailedIds((ids) => new Set(ids).add(track.id));
        setPlayingId((id) => (id === track.id ? null : id));
      });
    },
    [audio, playingId, stop],
  );

  useEffect(() => () => audioRef.current?.pause(), []);

  const controls = useMemo(
    () => ({ playingId, failedIds, toggle, stop }),
    [playingId, failedIds, toggle, stop],
  );

  return (
    <ControlsContext.Provider value={controls}>
      <ProgressContext.Provider value={progress}>{children}</ProgressContext.Provider>
    </ControlsContext.Provider>
  );
}

export function usePreviewPlayer(): PlayerControls {
  const ctx = useContext(ControlsContext);
  if (!ctx) throw new Error("usePreviewPlayer must be used inside PreviewPlayerProvider");
  return ctx;
}

export function PreviewButton({ track, tabIndex }: { track: Track; tabIndex?: number }) {
  const t = useT();
  const { playingId, failedIds, toggle } = usePreviewPlayer();
  const playing = playingId === track.id;
  const unavailable = !track.previewUrl || failedIds.has(track.id);
  const label = unavailable
    ? t.editor.noPreviewFor(track.title)
    : playing
      ? t.editor.stopPreview(track.title)
      : t.editor.playPreview(track.title);

  return (
    <button
      type="button"
      onClick={() => toggle(track)}
      disabled={unavailable}
      aria-label={label}
      title={unavailable ? t.editor.noPreview : undefined}
      aria-pressed={playing}
      tabIndex={tabIndex}
      className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-ink-600 text-paper-dim transition-colors hover:border-accent hover:text-paper disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-ink-600 aria-pressed:border-accent aria-pressed:text-accent"
    >
      {playing && <ProgressRing />}
      {playing ? (
        <svg viewBox="0 0 16 16" className="size-3" aria-hidden fill="currentColor">
          <rect x="3" y="3" width="10" height="10" rx="1.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" className="ml-0.5 size-3" aria-hidden fill="currentColor">
          <path d="M4 2.5v11l9.5-5.5z" />
        </svg>
      )}
    </button>
  );
}

function ProgressRing() {
  const progress = useContext(ProgressContext);
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 36 36" className="absolute -inset-px -rotate-90" aria-hidden>
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
        className="transition-[stroke-dashoffset] duration-300 ease-linear"
      />
    </svg>
  );
}
