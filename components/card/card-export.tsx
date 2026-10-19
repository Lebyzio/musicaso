"use client";

import { useState, useSyncExternalStore } from "react";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import { BUTTON_SECONDARY } from "@/components/share/share-actions";
import { cardFilename } from "@/lib/card/filename";
import {
  CARD_FORMATS,
  CARD_THEMES,
  type CardFormat,
  type CardTheme,
  cardPalette,
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
  /** `/r/{payload}` or `/l/{payload}` — the card route lives under it. null while there is nothing to render yet. */
  basePath: string | null;
  album: { title: string; artist: string };
  accent: string;
  theme: CardTheme;
  onThemeChange: (theme: CardTheme) => void;
}

/** Format + theme picker, live preview, PNG download and (on mobile) native file sharing. */
export function CardExport({ basePath, album, accent, theme, onThemeChange }: CardExportProps) {
  const [format, setFormat] = useState<CardFormat>("story");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const canShareFiles = useCanShareFiles();
  const t = useT();
  // The card is drawn in the viewer's language, whatever language the review was written in.
  const locale = useLocale();

  const cardUrl = basePath
    ? `${basePath}/card?format=${format}&theme=${theme}&lang=${locale}`
    : null;
  const filename = cardFilename(album, format);
  const busy = status.kind === "busy";
  const { width, height } = CARD_FORMATS[format];

  async function download() {
    if (!cardUrl) return;
    setStatus({ kind: "busy", label: t.card.preparing });
    try {
      const blob = await fetchCard(cardUrl);
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
      setStatus({ kind: "done", label: t.card.downloaded });
    } catch {
      setStatus({ kind: "error", label: t.card.failed });
    }
  }

  async function share() {
    if (!cardUrl) return;
    setStatus({ kind: "busy", label: t.card.preparing });
    try {
      const file = new File([await fetchCard(cardUrl)], filename, { type: "image/png" });
      await navigator.share({ files: [file], title: `${album.title} — ${album.artist}` });
      setStatus({ kind: "idle" });
    } catch (err) {
      // AbortError = the user closed the share sheet.
      if (err instanceof DOMException && err.name === "AbortError") setStatus({ kind: "idle" });
      else setStatus({ kind: "error", label: t.card.shareFailed });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="radiogroup"
          aria-label={t.card.format}
          className="flex rounded-full bg-ink-800 p-1"
        >
          {(Object.keys(CARD_FORMATS) as CardFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={format === f}
              onClick={() => setFormat(f)}
              className="rounded-full px-4 py-1.5 text-sm text-paper-dim transition-colors aria-checked:bg-accent aria-checked:text-accent-ink"
            >
              {t.card.formats[f]}
            </button>
          ))}
        </div>

        <div role="radiogroup" aria-label={t.card.theme} className="flex gap-2">
          {CARD_THEMES.map((option) => {
            const p = cardPalette(option, accent);
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={theme === option}
                aria-label={t.card.themes[option]}
                title={t.card.themes[option]}
                onClick={() => onThemeChange(option)}
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
            alt={t.card.previewAlt(t.card.formats[format])}
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
            {cardUrl ? t.card.unavailable : t.card.rateToSee}
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
          {t.card.download}
        </button>
        {canShareFiles && (
          <button
            type="button"
            onClick={share}
            disabled={!cardUrl || busy}
            className={BUTTON_SECONDARY}
          >
            {t.card.shareImage}
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
