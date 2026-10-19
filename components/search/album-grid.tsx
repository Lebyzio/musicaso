"use client";

import { motion } from "motion/react";
import type { AlbumSummary } from "@/lib/music/types";
import { AlbumCard } from "./album-card";

const GRID = "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5";

export function AlbumGrid({ albums }: { albums: AlbumSummary[] }) {
  return (
    <ul className={GRID}>
      {albums.map((album, i) => (
        <motion.li
          key={`${album.source}:${album.id}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: Math.min(i, 10) * 0.03, ease: [0.16, 1, 0.3, 1] }}
        >
          <AlbumCard album={album} priority={i < 4} />
        </motion.li>
      ))}
    </ul>
  );
}

export function AlbumGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <ul className={GRID} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex animate-pulse flex-col gap-3">
          <div className="aspect-square rounded-xl bg-ink-800" />
          <div className="h-4 w-3/4 rounded bg-ink-800" />
          <div className="h-3 w-1/2 rounded bg-ink-800" />
        </li>
      ))}
    </ul>
  );
}
