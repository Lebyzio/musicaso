import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-5 py-20">
      <p className="text-xs tracking-[0.25em] text-accent uppercase">404 · Hidden track</p>
      <h1 className="font-display text-4xl italic sm:text-6xl">Nothing on this side.</h1>
      <p className="max-w-md text-paper-dim">
        We couldn’t find that album or review. The link may be incomplete, or the album was removed
        from the catalogue.
      </p>
      <Link
        href="/"
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink"
      >
        Search albums
      </Link>
    </div>
  );
}
