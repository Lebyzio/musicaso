import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { SOURCE_LABEL, type SourceId } from "@/lib/music/types";

/** Some catalogue entries (pre-releases, region-locked editions) come back without tracks. */
export async function EmptyTracklist({ source }: { source: SourceId }) {
  const t = await getT();
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-ink-700 bg-ink-900/70 p-6">
      <p className="font-display text-2xl text-paper-dim italic">{t.status.emptyTitle}</p>
      <p className="max-w-md text-sm text-paper-mute">{t.status.emptyBody(SOURCE_LABEL[source])}</p>
      <Link
        href="/"
        className="rounded-full border border-ink-600 px-4 py-2 text-sm text-paper hover:border-accent"
      >
        {t.status.searchAgain}
      </Link>
    </div>
  );
}
