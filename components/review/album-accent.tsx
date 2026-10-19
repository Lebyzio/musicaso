"use client";

import { useEffect } from "react";
import type { Accent } from "@/lib/accent";

/**
 * Tints the whole document (header, footer, focus rings) with the album colour computed on the
 * server (lib/accent.ts). Content inside the page wrapper is already tinted on first paint via
 * an inline --album-accent; this extends it to <html> and restores the default on leave.
 */
export function AlbumAccent({ accent, ink }: Accent) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--album-accent", accent);
    root.style.setProperty("--album-accent-ink", ink);
    return () => {
      root.style.removeProperty("--album-accent");
      root.style.removeProperty("--album-accent-ink");
    };
  }, [accent, ink]);

  return null;
}
