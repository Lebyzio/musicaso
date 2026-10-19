"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ProviderErrorCode } from "@/lib/music/errors";

const MESSAGE: Partial<Record<ProviderErrorCode, string>> = {
  rate_limited: "The music catalogue is busy right now. Give it a few seconds and try again.",
};

export function AlbumLoadError({ code }: { code: ProviderErrorCode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-5 py-20">
      <p className="text-xs tracking-[0.25em] text-accent uppercase">Skipping…</p>
      <h1 className="font-display text-4xl italic sm:text-5xl">We couldn’t load this album.</h1>
      <p className="max-w-md text-paper-dim">
        {MESSAGE[code] ?? "The music catalogue didn’t answer as expected. Try again in a moment."}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => router.refresh())}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink disabled:opacity-60"
        >
          {pending ? "Retrying…" : "Try again"}
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
