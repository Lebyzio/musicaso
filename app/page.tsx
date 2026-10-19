import { Suspense } from "react";
import { AlbumGridSkeleton } from "@/components/search/album-grid";
import { AlbumSearch } from "@/components/search/album-search";
import { getLocale, getT } from "@/lib/i18n/server";

export default async function Home() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return (
    <div className="flex flex-col gap-10 pt-10 pb-20 sm:gap-14 sm:pt-16">
      <header className="flex flex-col gap-5">
        <p className="text-xs tracking-[0.25em] text-accent uppercase">{t.home.kicker}</p>
        <h1
          className={`max-w-3xl font-display text-5xl tracking-tight text-balance sm:text-7xl ${
            // Thai vowels and tone marks need room above and below the line.
            locale === "th" ? "leading-[1.3]" : "leading-[0.95]"
          }`}
        >
          {t.home.title}
          <br />
          <span className="text-paper-dim italic">{t.home.titleAccent}</span>
        </h1>
        <p className="max-w-xl text-lg text-pretty text-paper-dim">{t.home.lead}</p>
      </header>

      {/* useSearchParams needs a Suspense boundary. */}
      <Suspense fallback={<SearchFallback />}>
        <AlbumSearch />
      </Suspense>
    </div>
  );
}

function SearchFallback() {
  return (
    <div className="flex flex-col gap-8" aria-hidden>
      <div className="h-[3.75rem] rounded-full border border-ink-700 bg-ink-900" />
      <AlbumGridSkeleton count={5} />
    </div>
  );
}
