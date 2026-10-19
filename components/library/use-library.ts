"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { attachAlbum, clearDraft, type LibraryEntry, listDrafts } from "@/lib/draft";
import type { AlbumSummary } from "@/lib/music/types";

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab rating an album updates this list too.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Serialised so useSyncExternalStore sees an unchanged string when nothing changed. */
const getSnapshot = () => JSON.stringify(listDrafts());
const getServerSnapshot = () => null;

/** Drafts already asked for, so a failing album isn't refetched on every render. */
const requested = new Set<string>();

/**
 * Reviews saved in this browser; null until read on the client (localStorage).
 * Drafts saved before album details were stored get them filled in, one request at a time.
 */
export function useLibrary(): LibraryEntry[] | null {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const entries = useMemo(
    () => (snapshot === null ? null : (JSON.parse(snapshot) as LibraryEntry[])),
    [snapshot],
  );

  useEffect(() => {
    const missing = (entries ?? []).filter(
      (e) => !e.album && !requested.has(`${e.source}:${e.id}`),
    );
    if (missing.length === 0) return;
    const controller = new AbortController();
    (async () => {
      for (const entry of missing) {
        requested.add(`${entry.source}:${entry.id}`);
        try {
          const res = await fetch(`/api/album/${entry.source}/${encodeURIComponent(entry.id)}`, {
            signal: controller.signal,
          });
          if (!res.ok) continue;
          const album = (await res.json()) as AlbumSummary;
          const attached = attachAlbum(entry.source, entry.id, {
            title: album.title,
            artist: album.artist,
            year: album.year,
            cover: album.coverThumbUrl || undefined,
          });
          if (attached) notify();
        } catch {
          if (controller.signal.aborted) return;
        }
      }
    })();
    return () => controller.abort();
  }, [entries]);

  return entries;
}

export function removeFromLibrary(source: string, id: string): void {
  clearDraft(source, id);
  notify();
}
