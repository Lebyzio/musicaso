import Link from "next/link";

export type BrokenReason = "empty" | "corrupt" | "unsupported_version" | "invalid" | "album_gone";

const COPY: Record<BrokenReason, { title: string; body: string }> = {
  empty: {
    title: "This link has no review in it.",
    body: "It looks like only part of the link was copied.",
  },
  corrupt: {
    title: "This review link is broken.",
    body: "It may have been cut off or changed when it was copied. Ask for the full link again.",
  },
  invalid: {
    title: "This review link is broken.",
    body: "It may have been cut off or changed when it was copied. Ask for the full link again.",
  },
  unsupported_version: {
    title: "This review was made with a newer musicaso.",
    body: "Refresh the page — if it still won’t open, this version can’t read it yet.",
  },
  album_gone: {
    title: "This album isn’t available anymore.",
    body: "The music catalogue no longer lists the album this review was about.",
  },
};

export function BrokenLink({ reason }: { reason: BrokenReason }) {
  const { title, body } = COPY[reason];
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-5 py-20">
      <p className="text-xs tracking-[0.25em] text-accent uppercase">Skipped track</p>
      <h1 className="max-w-2xl font-display text-4xl italic sm:text-5xl">{title}</h1>
      <p className="max-w-md text-paper-dim">{body}</p>
      <Link
        href="/"
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink"
      >
        Review an album yourself
      </Link>
    </div>
  );
}
