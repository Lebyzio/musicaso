import Link from "next/link";
import { SOURCE_LABEL, type SourceId } from "@/lib/music/types";

/** Some catalogue entries (pre-releases, region-locked editions) come back without tracks. */
export function EmptyTracklist({ source }: { source: SourceId }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-ink-700 bg-ink-900/70 p-6">
      <p className="font-display text-2xl text-paper-dim italic">No tracks listed.</p>
      <p className="max-w-md text-sm text-paper-mute">
        {SOURCE_LABEL[source]} doesn’t list any tracks for this release yet. Another edition of the
        album may have them.
      </p>
      <Link
        href="/"
        className="rounded-full border border-ink-600 px-4 py-2 text-sm text-paper hover:border-accent"
      >
        Search again
      </Link>
    </div>
  );
}
