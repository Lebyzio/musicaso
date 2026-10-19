import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-5 py-20">
      <p className="text-xs tracking-[0.25em] text-accent uppercase">{t.status.notFoundKicker}</p>
      <h1 className="font-display text-4xl italic sm:text-6xl">{t.status.notFoundTitle}</h1>
      <p className="max-w-md text-paper-dim">{t.status.notFoundBody}</p>
      <Link
        href="/"
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink"
      >
        {t.status.searchAlbums}
      </Link>
    </div>
  );
}
