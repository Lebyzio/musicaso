import { decode } from "jpeg-js";
import { after } from "next/server";
import type { CSSProperties } from "react";
import { cache } from "react";
import { accentFromPixels, DEFAULT_ACCENT, inkFor, toHex } from "./color";
import { isAllowedImageUrl } from "./music/hosts";
import { coverAtSize } from "./music/cover";

export interface Accent {
  accent: string;
  ink: string;
}

export const DEFAULT_ACCENT_PAIR: Accent = {
  accent: toHex(DEFAULT_ACCENT),
  ink: toHex(inkFor(DEFAULT_ACCENT)),
};

/** 64px is plenty for a dominant colour and keeps the fetch to a few KB. */
const SAMPLE_PX = 64;
const MAX_BYTES = 256 * 1024;
/** Cover Art Archive (served from archive.org) can take 5s+ on a cold cover. */
const FETCH_TIMEOUT_MS = 12_000;
/** How long a page render waits for the accent before using the default. */
const PAGE_BUDGET_MS = 1500;

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/**
 * The cover's accent colour, computed on the server so the page, OG image and PNG cards all
 * agree and the first render is already tinted. Never throws — any failure gives the default.
 */
export const getAlbumAccent = cache(async (coverUrl: string): Promise<Accent> => {
  const url = coverAtSize(coverUrl, SAMPLE_PX);
  if (!isAllowedImageUrl(url)) return DEFAULT_ACCENT_PAIR;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return DEFAULT_ACCENT_PAIR;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length > MAX_BYTES || !isJpeg(bytes)) return DEFAULT_ACCENT_PAIR;
    const { data } = decode(bytes, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: 1 });
    return accentFromPixels(data);
  } catch {
    return DEFAULT_ACCENT_PAIR;
  }
});

/**
 * The accent for a page render, without holding the page for a slow cover host: past the budget
 * the page uses the default colour, and the fetch finishes after the response so the next visit
 * gets the real colour from the Data Cache. Image routes call getAlbumAccent() and wait.
 */
export async function getPageAccent(coverUrl: string): Promise<Accent> {
  const pending = getAlbumAccent(coverUrl);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fallback = new Promise<"slow">((resolve) => {
    timer = setTimeout(() => resolve("slow"), PAGE_BUDGET_MS);
  });
  const first = await Promise.race([pending, fallback]);
  clearTimeout(timer);
  if (first !== "slow") return first;
  after(() => pending);
  return DEFAULT_ACCENT_PAIR;
}

/** Inline style for a page wrapper so server-rendered content uses the album colour immediately. */
export function accentStyle({ accent, ink }: Accent): CSSProperties {
  return { "--album-accent": accent, "--album-accent-ink": ink } as CSSProperties;
}
