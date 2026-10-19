"use client";

import { useMemo, useSyncExternalStore } from "react";
import { CardExport } from "@/components/card/card-export";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import { useDebouncedValue } from "@/components/search/use-debounced-value";
import { CopyLinkButton, NativeShareButton } from "@/components/share/share-actions";
import type { CardTheme } from "@/lib/card/themes";
import type { SourceId } from "@/lib/music/types";
import { isScored, type Rating } from "@/lib/score";
import { buildPayload, fitShareUrl, URL_LIMIT } from "@/lib/share/encode";
import { NAME_MAX, TEXT_MAX } from "@/lib/share/limits";
import type { EditorAction } from "./editor-state";

const subscribeNever = () => () => {};

export interface Reference {
  name: string | undefined;
  ratings: Rating[];
}

interface SharePanelProps {
  source: SourceId;
  albumId: string;
  albumTitle: string;
  albumArtist: string;
  accent: string;
  theme: CardTheme;
  ratings: Rating[];
  weighted: boolean;
  name: string;
  text: string;
  reference: Reference | undefined;
  dispatch: (action: EditorAction) => void;
}

const FIELD =
  "w-full rounded-xl border border-ink-700 bg-ink-950 px-3 py-2 text-paper placeholder:text-paper-mute focus:border-accent focus:outline-none focus-visible:outline-none";

export function SharePanel({
  source,
  albumId,
  albumTitle,
  albumArtist,
  accent,
  theme,
  ratings,
  weighted,
  name,
  text,
  reference,
  dispatch,
}: SharePanelProps) {
  const t = useT();
  const locale = useLocale();
  const origin = useSyncExternalStore(
    subscribeNever,
    () => window.location.origin,
    () => "",
  );
  const canShare = ratings.some(isScored);

  // Rebuilt on every edit; encoding a payload takes well under a millisecond.
  const fit = useMemo(() => {
    if (!origin || !canShare) return null;
    const payload = buildPayload({
      source,
      albumId,
      ratings,
      name,
      text,
      weighted,
      theme,
      locale,
      reference,
    });
    return fitShareUrl(origin, payload);
  }, [origin, canShare, source, albumId, ratings, name, text, weighted, theme, locale, reference]);

  // The card preview re-renders on the server, so wait until typing/rating pauses.
  const reviewPath = useDebouncedValue(fit && !fit.tooLong ? new URL(fit.url).pathname : null, 700);

  const textLength = [...text].length;
  const getUrl = () => fit?.url ?? "";
  const unavailable = !fit || fit.tooLong;
  const shareTitle = t.share.shareTitle(name.trim(), albumTitle);

  return (
    <section
      id="share"
      aria-labelledby="share-heading"
      className="flex scroll-mt-6 flex-col gap-4 rounded-card border border-ink-700 bg-ink-900/70 p-6"
    >
      <h2 id="share-heading" className="text-xs tracking-[0.25em] text-paper-mute uppercase">
        {t.share.heading}
      </h2>

      <label className="flex flex-col gap-1.5 text-sm text-paper-dim">
        {t.share.yourName}
        <input
          value={name}
          onChange={(e) => dispatch({ type: "setName", value: e.target.value })}
          maxLength={NAME_MAX}
          autoComplete="nickname"
          placeholder={t.share.optional}
          className={FIELD}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-paper-dim">
        <span className="flex justify-between">
          {t.share.yourTake}
          <span className="text-xs text-paper-mute tabular" aria-hidden>
            {textLength}/{TEXT_MAX}
          </span>
        </span>
        <textarea
          value={text}
          onChange={(e) => dispatch({ type: "setText", value: e.target.value })}
          maxLength={TEXT_MAX}
          rows={3}
          placeholder={t.share.takePlaceholder}
          className={`${FIELD} resize-none leading-normal`}
        />
      </label>

      {fit?.truncated && !fit.tooLong && (
        <p role="status" className="text-xs text-score-mid">
          {t.share.truncated([...(fit.payload.t ?? "")].length - 1, URL_LIMIT.toLocaleString("en"))}
        </p>
      )}
      {fit?.tooLong && (
        <p role="status" className="text-xs text-score-low">
          {t.share.tooLong}
        </p>
      )}
      {!canShare && <p className="text-xs text-paper-mute">{t.share.rateFirst}</p>}

      <div className="flex flex-wrap gap-2">
        <CopyLinkButton getUrl={getUrl} disabled={unavailable} />
        <NativeShareButton
          getUrl={getUrl}
          title={shareTitle}
          text={text.trim() || undefined}
          disabled={unavailable}
        />
        {fit && !fit.tooLong && (
          <a
            href={fit.url}
            target="_blank"
            rel="noopener"
            className="rounded-full px-4 py-2.5 text-sm text-paper-dim underline decoration-ink-600 underline-offset-4 hover:text-paper hover:decoration-accent"
          >
            {t.share.preview}
          </a>
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-ink-700 pt-5">
        <h3 className="text-xs tracking-[0.25em] text-paper-mute uppercase">{t.share.imageCard}</h3>
        <CardExport
          reviewPath={reviewPath}
          album={{ title: albumTitle, artist: albumArtist }}
          accent={accent}
          theme={theme}
          onThemeChange={(value) => dispatch({ type: "setTheme", value })}
        />
      </div>
    </section>
  );
}
