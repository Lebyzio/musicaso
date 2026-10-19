"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AlbumError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-5 py-20">
      <p className="text-xs tracking-[0.25em] text-accent uppercase">Scratched record</p>
      <h1 className="font-display text-4xl italic sm:text-5xl">Something went wrong.</h1>
      <p className="max-w-md text-paper-dim">
        This page hit an unexpected error. Your ratings are saved in this browser.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-ink-600 px-5 py-2.5 text-sm text-paper hover:border-accent"
        >
          Back to search
        </Link>
      </div>
    </div>
  );
}
