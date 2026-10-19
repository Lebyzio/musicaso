import { Suspense } from "react";
import { AlbumGridSkeleton } from "@/components/search/album-grid";
import { AlbumSearch } from "@/components/search/album-search";

export default function Home() {
  return (
    <div className="flex flex-col gap-10 pt-10 pb-20 sm:gap-14 sm:pt-16">
      <header className="flex flex-col gap-5">
        <p className="text-xs tracking-[0.25em] text-accent uppercase">Side A · Track 01</p>
        <h1 className="max-w-3xl font-display text-5xl leading-[0.95] tracking-tight text-balance sm:text-7xl">
          Rate every track.
          <br />
          <span className="text-paper-dim italic">Share the verdict.</span>
        </h1>
        <p className="max-w-xl text-lg text-pretty text-paper-dim">
          Find an album, score it song by song, and send the verdict as a link or a card.
        </p>
      </header>

      {/* useSearchParams needs a Suspense boundary to keep the page statically prerendered. */}
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
