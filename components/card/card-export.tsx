"use client";

import { useState, useSyncExternalStore } from "react";
import { BUTTON_SECONDARY } from "@/components/share/share-actions";
import { cardFilename } from "@/lib/card/filename";
import {
  CARD_FORMATS,
  CARD_THEMES,
  type CardFormat,
  type CardTheme,
  cardPalette,
  THEME_LABEL,
} from "@/lib/card/themes";

const subscribeNever = () => () => {};

/** Web Share with files — mostly mobile browsers. false during SSR. */
function useCanShareFiles(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => {
      try {
        const probe = new File([new Uint8Array(1)], "card.png", { type: "image/png" });
        return typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] });
      } catch {
        return false;
      }
    },
    () => false,
  );
}

async function fetchCard(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Card request failed (${res.status})`);
  return res.blob();
}

type Status =
  { kind: "idle" } | { kind: "busy"; label: string } | { kind: "done" | "error"; label: string };

interface CardExportProps {
  /** `/r/{payload}` — the card lives under it. null while there is nothing to render yet. */
  reviewPath: string | null;
  album: { title: string; artist: string };
  accent: string;
  theme: CardTheme;
  onThemeChange: (theme: CardTheme) => void;
}

/** Format + theme picker, live preview, PNG download and (on mobile) native file sharing. */
export function CardExport({ reviewPath, album, accent, theme, onThemeChange }: CardExportProps) {
  const [format, setFormat] = useState<CardFormat>("story");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const canShareFiles = useCanShareFiles();

  const cardUrl = reviewPath ? `${reviewPath}/card?format=${format}&theme=${theme}` : null;
  const filename = cardFilename(album, format);
  const busy = status.kind === "busy";
  const { width, height } = CARD_FORMATS[format];

  async function download() {
    if (!cardUrl) return;
    setStatus({ kind: "busy", label: "Preparing image…" });
    try {
      const blob = await fetchCard(cardUrl);
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
      setStatus({ kind: "done", label: "Card downloaded" });
    } catch {
      setStatus({ kind: "error", label: "Couldn’t create the card. Try again." });
    }
  }

  async function share() {
    if (!cardUrl) return;
    setStatus({ kind: "busy", label: "Preparing image…" });
    try {
      const file = new File([await fetchCard(cardUrl)], filename, { type: "image/png" });
      await navigator.share({ files: [file], title: `${album.title} — ${album.artist}` });
      setStatus({ kind: "idle" });
    } catch (err) {
      // AbortError = the user closed the share sheet.
      if (err instanceof DOMException && err.name === "AbortError") setStatus({ kind: "idle" });
      else setStatus({ kind: "error", label: "Sharing didn’t work — try Download instead." });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="radiogroup"
          aria-label="Card format"
          className="flex rounded-full bg-ink-800 p-1"
        >
          {(Object.keys(CARD_FORMATS) as CardFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={format === f}
              onClick={() => setFormat(f)}
              className="rounded-full px-4 py-1.5 text-sm text-paper-dim capitalize transition-colors aria-checked:bg-accent aria-checked:text-accent-ink"
            >
              {f}
            </button>
          ))}
        </div>

        <div role="radiogroup" aria-label="Card theme" className="flex gap-2">
          {CARD_THEMES.map((t) => {
            const p = cardPalette(t, accent);
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={theme === t}
                aria-label={THEME_LABEL[t]}
                title={THEME_LABEL[t]}
                onClick={() => onThemeChange(t)}
                className="flex size-9 items-center justify-center rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-ink-900 transition-shadow aria-checked:ring-accent"
                style={{ background: p.bg, boxShadow: `inset 0 0 0 1px ${p.mute}55` }}
              >
                <span className="size-3 rounded-full" style={{ background: p.score }} />
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="relative mx-auto w-full overflow-hidden rounded-xl bg-ink-800"
        style={{ aspectRatio: `${width} / ${height}`, maxWidth: format === "story" ? 220 : 320 }}
      >
        {cardUrl && failedUrl !== cardUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- generated PNG, not an optimisable asset
          <img
            key={cardUrl}
            src={cardUrl}
            alt={`Preview of the ${format} card`}
            onLoad={() => setLoadedUrl(cardUrl)}
            onError={() => setFailedUrl(cardUrl)}
            className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${
              loadedUrl === cardUrl ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
        {cardUrl && loadedUrl !== cardUrl && failedUrl !== cardUrl && (
          <div className="absolute inset-0 animate-pulse bg-ink-700/40" aria-hidden />
        )}
        {(!cardUrl || failedUrl === cardUrl) && (
          <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-paper-mute">
            {cardUrl ? "Preview unavailable" : "Rate a track to see your card"}
          </p>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={download}
          disabled={!cardUrl || busy}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink disabled:opacity-50"
        >
          Download PNG
        </button>
        {canShareFiles && (
          <button
            type="button"
            onClick={share}
            disabled={!cardUrl || busy}
            className={BUTTON_SECONDARY}
          >
            Share image…
          </button>
        )}
      </div>

      <p
        aria-live="polite"
        className={`min-h-4 text-center text-xs ${status.kind === "error" ? "text-score-low" : "text-paper-mute"}`}
      >
        {status.kind === "idle" ? "" : status.label}
      </p>
    </div>
  );
}
