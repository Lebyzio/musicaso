"use client";

import { useEffect } from "react";
import { accentFromPixels } from "@/lib/color";

const SAMPLE = 32;

/**
 * Tints the page with the cover's dominant colour by setting --album-accent on <html>.
 * The cover is loaded through /api/cover (same origin) so the canvas stays readable.
 */
export function AlbumAccent({ coverUrl }: { coverUrl: string }) {
  useEffect(() => {
    if (!coverUrl) return;
    const root = document.documentElement;
    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = SAMPLE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
        const { accent, ink } = accentFromPixels(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data);
        root.style.setProperty("--album-accent", accent);
        root.style.setProperty("--album-accent-ink", ink);
      } catch {
        // Tainted canvas or decode failure — keep the default accent.
      }
    };
    img.src = `/api/cover?url=${encodeURIComponent(coverUrl)}`;

    return () => {
      cancelled = true;
      root.style.removeProperty("--album-accent");
      root.style.removeProperty("--album-accent-ink");
    };
  }, [coverUrl]);

  return null;
}
