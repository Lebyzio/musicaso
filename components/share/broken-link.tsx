import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export type BrokenReason = "empty" | "corrupt" | "unsupported_version" | "invalid" | "album_gone";

export async function BrokenLink({ reason }: { reason: BrokenReason }) {
  const t = await getT();
  const { title, body } = t.status.broken[reason === "invalid" ? "corrupt" : reason];
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-5 py-20">
      <p className="text-xs tracking-[0.25em] text-accent uppercase">{t.status.brokenKicker}</p>
      <h1 className="max-w-2xl font-display text-4xl italic sm:text-5xl">{title}</h1>
      <p className="max-w-md text-paper-dim">{body}</p>
      <Link
        href="/"
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink"
      >
        {t.status.reviewYourself}
      </Link>
    </div>
  );
}
