"use client";

import { useState } from "react";
import { CardExport } from "@/components/card/card-export";
import type { CardTheme } from "@/lib/card/themes";

/** Image-card section on a shared review. The viewer can pick another theme without changing the link. */
export function SharedCard({
  reviewPath,
  album,
  accent,
  initialTheme,
}: {
  reviewPath: string;
  album: { title: string; artist: string };
  accent: string;
  initialTheme: CardTheme;
}) {
  const [theme, setTheme] = useState(initialTheme);
  return (
    <section
      aria-labelledby="card-heading"
      className="flex flex-col gap-4 rounded-card border border-ink-700 bg-ink-900/70 p-6"
    >
      <h2 id="card-heading" className="text-xs tracking-[0.25em] text-paper-mute uppercase">
        Image card
      </h2>
      <CardExport
        reviewPath={reviewPath}
        album={album}
        accent={accent}
        theme={theme}
        onThemeChange={setTheme}
      />
    </section>
  );
}
