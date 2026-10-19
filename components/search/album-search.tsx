"use client";

import { MotionConfig } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { ApiErrorBody, ApiErrorCode } from "@/lib/api-response";
import type { SearchResult } from "@/lib/music";
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

const ERROR_MESSAGE: Partial<Record<ApiErrorCode | "network", string>> = {
  rate_limited: "The music catalogue is busy right now — give it a few seconds.",
  network: "Couldn’t connect. Check your connection and try again.",
};

export function AlbumSearch() {
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
      ? "Searching…"
      : current?.ok
        ? plural(current.data.results.length, "album") + " found"
        : "Search failed";

  return (
    <MotionConfig reducedMotion="user">
      <section className="flex flex-col gap-8" aria-label="Album search">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            runNow(input);
          }}
        >
          <label htmlFor="album-search" className="sr-only">
            Search albums
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-paper-mute" />
            <input
              id="album-search"
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search an album or artist"
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
                  aria-label="Clear search"
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
            <span>Try</span>
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
            <p className="text-paper-dim">
              {ERROR_MESSAGE[current.code] ?? "We couldn’t reach the music catalogue."}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink"
              >
                Try again
              </button>
              {source !== "it" && (
                <button
                  type="button"
                  onClick={() => switchSource("it")}
                  className="rounded-full border border-ink-600 px-4 py-2 text-sm text-paper hover:border-accent"
                >
                  Search Apple Music instead
                </button>
              )}
            </div>
          </div>
        )}

        {loading && !shown && <AlbumGridSkeleton />}

        {shown && (
          <div
            className={`flex flex-col gap-6 transition-opacity ${loading ? "opacity-50" : ""}`}
            aria-busy={loading}
          >
            {shown.data.results.length === 0 ? (
              <EmptyState
                query={shown.query}
                onSwitch={shown.data.source === "dz" ? () => switchSource("it") : undefined}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs tracking-[0.15em] text-paper-mute uppercase">
                  <span className="tabular">{plural(shown.data.results.length, "result")}</span>
                  <span className="flex items-baseline gap-3">
                    <span>Data from {SOURCE_LABEL[shown.data.source]}</span>
                    <button
                      type="button"
                      onClick={() => switchSource(shown.data.source === "dz" ? "it" : "dz")}
                      className="tracking-normal text-paper-dim normal-case underline decoration-ink-600 underline-offset-4 hover:text-paper hover:decoration-accent"
                    >
                      Try {SOURCE_LABEL[shown.data.source === "dz" ? "it" : "dz"]}
                    </button>
                  </span>
                </div>
                <AlbumGrid albums={shown.data.results} />
              </>
            )}
          </div>
        )}
      </section>
    </MotionConfig>
  );
}

function EmptyState({ query, onSwitch }: { query: string; onSwitch?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 py-8">
      <p className="font-display text-2xl text-paper-dim italic">
        Nothing for “<span className="not-italic">{query}</span>”.
      </p>
      <p className="text-sm text-paper-mute">Check the spelling, or search by artist name.</p>
      {onSwitch && (
        <button
          type="button"
          onClick={onSwitch}
          className="rounded-full border border-ink-600 px-4 py-2 text-sm text-paper hover:border-accent"
        >
          Search Apple Music instead
        </button>
      )}
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

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
