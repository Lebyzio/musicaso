"use client";

import { useState } from "react";
import { CardExport } from "@/components/card/card-export";
import { useT } from "@/components/i18n/locale-provider";
import type { CardTheme } from "@/lib/card/themes";

/** Image-card section on a shared list. The viewer picks format and theme; the link stays the same. */
export function SharedListCard({
  basePath,
  filenameAlbum,
  accent,
}: {
  basePath: string;
  filenameAlbum: { title: string; artist: string };
  accent: string;
}) {
  const t = useT();
  const [theme, setTheme] = useState<CardTheme>("sleeve");
  return (
    <section
      aria-labelledby="list-card-heading"
      className="flex flex-col gap-4 rounded-card border border-ink-700 bg-ink-900/70 p-6"
    >
      <h2 id="list-card-heading" className="text-xs tracking-[0.25em] text-paper-mute uppercase">
        {t.share.imageCard}
      </h2>
      <CardExport
        basePath={basePath}
        album={filenameAlbum}
        accent={accent}
        theme={theme}
        onThemeChange={setTheme}
      />
    </section>
  );
}
