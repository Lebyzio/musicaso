"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useT } from "@/components/i18n/locale-provider";
import type { ProviderErrorCode } from "@/lib/music/errors";

export function AlbumLoadError({ code }: { code: ProviderErrorCode }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-5 py-20">
      <p className="text-xs tracking-[0.25em] text-accent uppercase">{t.status.loadKicker}</p>
      <h1 className="font-display text-4xl italic sm:text-5xl">{t.status.loadTitle}</h1>
      <p className="max-w-md text-paper-dim">
        {code === "rate_limited" ? t.status.busy : t.status.unexpected}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => router.refresh())}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink disabled:opacity-60"
        >
          {pending ? t.status.retrying : t.status.tryAgain}
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
