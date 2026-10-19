"use client";

import { MotionConfig } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/locale-provider";
import type { ApiErrorBody, ApiErrorCode } from "@/lib/api-response";
import type { ArtistAlbums, SearchResult } from "@/lib/music";
import { SOURCE_LABEL } from "@/lib/music/types";
import { AlbumGrid, AlbumGridSkeleton } from "./album-grid";
import { useDebouncedValue } from "./use-debounced-value";

type Source = SearchResult["source"];
type Outcome =
  | { key: string; ok: true; query: string; data: SearchResult }
  | { key: string; ok: false; code: ApiErrorCode | "network" };

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;
const SUGGESTIONS = ["In Rainbows", "Blonde", "คราม", "Abbey Road", "Bodyslam"];
/** Order of the "Try …" links; the source that answered is left out. */
const SOURCES: Source[] = ["dz", "it", "mb"];

export function AlbumSearch() {
  const t = useT();
  const searchParams = useSearchParams();
  const [input, setInput] = useState(() => searchParams.get("q") ?? "");
  // Enter / suggestion clicks skip the debounce.
  const [flushed, setFlushed] = useState<string | null>(null);
  const debounced = useDebouncedValue(input.trim(), DEBOUNCE_MS);
  const query = flushed !== null && flushed === input.trim() ? flushed : debounced;

  // A manual source choice only applies to the query it was made for.
  const [override, setOverride] = useState<{ query: string; source: Source } | null>(null);
  const source = override?.query === query ? override.source : undefined;
  const [attempt, setAttempt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const key = query.length >= MIN_CHARS ? `${source ?? "auto"}|${attempt}|${query}` : null;
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [lastOk, setLastOk] = useState<(Outcome & { ok: true }) | null>(null);

  // Keep ?q= in the address bar so Back from an album page lands on the same results.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
  }, [query]);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ q: query });
    if (source) params.set("source", source);

    fetch(`/api/search?${params}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
          setOutcome({ key, ok: false, code: body?.error.code ?? "internal" });
          return;
        }
        const next = { key, ok: true, query, data: (await res.json()) as SearchResult } as const;
        setOutcome(next);
        setLastOk(next);
      })
      .catch(() => {
        if (!controller.signal.aborted) setOutcome({ key, ok: false, code: "network" });
      });
    return () => controller.abort();
  }, [key, query, source]);

  const current = key && outcome?.key === key ? outcome : null;
  const loading = key !== null && current === null;
  // While a new search is in flight, keep showing the previous results (dimmed) instead of flashing.
  const shown = current?.ok ? current : loading ? lastOk : null;

  function runNow(value: string) {
    setInput(value);
    setFlushed(value.trim());
  }

  function switchSource(next: Source) {
    setOverride({ query, source: next });
  }

  const status = !key
    ? ""
    : loading
      ? t.search.searching
      : current?.ok
        ? t.search.found(current.data.results.length + (current.data.artist?.albums.length ?? 0))
        : t.search.failed;

  const errorMessage = (code: ApiErrorCode | "network") =>
    code === "rate_limited"
      ? t.search.busy
      : code === "network"
        ? t.search.offline
        : t.search.unreachable;

  return (
    <MotionConfig reducedMotion="user">
      <section className="flex flex-col gap-8" aria-label={t.search.region}>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            runNow(input);
          }}
        >
          <label htmlFor="album-search" className="sr-only">
            {t.search.label}
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-paper-mute" />
            <input
              id="album-search"
              ref={inputRef}
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.search.placeholder}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              maxLength={100}
              className="w-full rounded-full border border-ink-700 bg-ink-900 py-4 pr-14 pl-13 text-lg text-paper shadow-inner shadow-black/30 transition-colors placeholder:text-paper-mute hover:border-ink-600 focus:border-accent focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
            />
            {loading ? (
              <span
                aria-hidden
                className="absolute top-1/2 right-5 size-5 -translate-y-1/2 animate-spin rounded-full border-2 border-ink-600 border-t-accent"
              />
            ) : (
              input && (
                <button
                  type="button"
                  onClick={() => runNow("")}
                  aria-label={t.search.clear}
                  className="absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-paper-mute hover:bg-ink-800 hover:text-paper"
                >
                  <span aria-hidden className="text-xl leading-none">
                    ×
                  </span>
                </button>
              )
            )}
          </div>
        </form>

        <p aria-live="polite" className="sr-only">
          {status}
        </p>

        {!key && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-paper-mute">
            <span>{t.search.try}</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => runNow(s)}
                className="rounded-full border border-ink-700 px-3 py-1 text-paper-dim transition-colors hover:border-accent hover:text-paper"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {current && !current.ok && (
          <div className="flex flex-col items-start gap-4 rounded-card border border-ink-700 bg-ink-900 p-6">
            <p className="text-paper-dim">{errorMessage(current.code)}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setAttempt((n) => n + 1);
                  inputRef.current?.focus(); // the button disappears; keep focus somewhere useful
                }}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink"
              >
                {t.search.tryAgain}
              </button>
              {/* "auto" starts at Deezer, so offer the others. */}
              {SOURCES.filter((s) => s !== (source ?? "dz")).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => switchSource(s)}
                  className="rounded-full border border-ink-600 px-4 py-2 text-sm text-paper hover:border-accent"
                >
                  {t.search.searchInstead(SOURCE_LABEL[s])}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && !shown && <AlbumGridSkeleton />}

        {shown && (
          <div
            className={`flex flex-col gap-6 transition-opacity ${loading ? "opacity-50" : ""}`}
            aria-busy={loading}
          >
            {shown.data.artist && (
              // Keyed by query so "Show all" collapses again for a new search.
              <ArtistSection key={shown.query} artist={shown.data.artist} />
            )}
            {shown.data.results.length > 0 ? (
              <section className="flex flex-col gap-6" aria-label={t.search.resultsRegion}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs tracking-[0.15em] text-paper-mute uppercase">
                  <span className="tabular">
                    {shown.data.artist ? `${t.search.moreResults} · ` : ""}
                    {t.search.results(shown.data.results.length)}
                  </span>
                  <span className="flex items-baseline gap-3">
                    <span>{t.search.dataFrom(SOURCE_LABEL[shown.data.source])}</span>
                    {SOURCES.filter((s) => s !== shown.data.source).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => switchSource(s)}
                        className="tracking-normal text-paper-dim normal-case underline decoration-ink-600 underline-offset-4 hover:text-paper hover:decoration-accent"
                      >
                        {t.search.tryOther(SOURCE_LABEL[s])}
                      </button>
                    ))}
                  </span>
                </div>
                <AlbumGrid albums={shown.data.results} eager={shown.data.artist ? 0 : 4} />
              </section>
            ) : (
              !shown.data.artist && (
                <EmptyState
                  query={shown.query}
                  others={SOURCES.filter((s) => s !== shown.data.source)}
                  onSwitch={switchSource}
                />
              )
            )}
          </div>
        )}
      </section>
    </MotionConfig>
  );
}

/** Discography cards shown before the user asks for more (two rows on wide screens). */
const ARTIST_PREVIEW = 10;

function ArtistSection({ artist }: { artist: ArtistAlbums }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const hidden = artist.albums.length - ARTIST_PREVIEW;
  const albums = expanded ? artist.albums : artist.albums.slice(0, ARTIST_PREVIEW);
  return (
    <section className="flex flex-col gap-6" aria-labelledby="artist-albums">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="artist-albums" className="font-display text-2xl text-paper">
          {t.search.albumsBy(artist.name)}
        </h2>
        <span className="text-xs tracking-[0.15em] text-paper-mute uppercase">
          {t.search.dataFrom(SOURCE_LABEL.dz)}
        </span>
      </div>
      <AlbumGrid albums={albums} />
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="self-start rounded-full border border-ink-600 px-4 py-2 text-sm text-paper hover:border-accent"
        >
          {expanded ? t.search.showFewer : t.search.showAll(artist.albums.length)}
        </button>
      )}
    </section>
  );
}

function EmptyState({
  query,
  others,
  onSwitch,
}: {
  query: string;
  others: Source[];
  onSwitch: (source: Source) => void;
}) {
  const t = useT();
  const nothing = t.search.nothingFor(query);
  return (
    <div className="flex flex-col items-start gap-3 py-8">
      <p className="font-display text-2xl text-paper-dim italic">
        {nothing.before}
        <span className="not-italic">{nothing.query}</span>
        {nothing.after}
      </p>
      <p className="text-sm text-paper-mute">{t.search.hint}</p>
      <div className="flex flex-wrap gap-2">
        {others.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSwitch(s)}
            className="rounded-full border border-ink-600 px-4 py-2 text-sm text-paper hover:border-accent"
          >
            {t.search.searchInstead(SOURCE_LABEL[s])}
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}
