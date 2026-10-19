"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useT } from "@/components/i18n/locale-provider";

/** Body of route error boundaries (error.tsx): message, retry, and a way home. */
export function ErrorState({
  error,
  retry,
  title,
  body,
}: {
  error: unknown;
  retry: () => void;
  title?: string;
  body?: string;
}) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-5 py-20">
      <p className="text-xs tracking-[0.25em] text-accent uppercase">{t.status.errorKicker}</p>
      <h1 className="font-display text-4xl italic sm:text-5xl">{title ?? t.status.errorTitle}</h1>
      <p className="max-w-md text-paper-dim">{body ?? t.status.errorBody}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink"
        >
          {t.status.tryAgain}
        </button>
        <Link
          href="/"
          className="rounded-full border border-ink-600 px-5 py-2.5 text-sm text-paper hover:border-accent"
        >
          {t.status.backToSearch}
        </Link>
      </div>
    </div>
  );
}
