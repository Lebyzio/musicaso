import { getT } from "@/lib/i18n/server";

export default async function Loading() {
  const t = await getT();
  return (
    <div
      className="flex animate-pulse flex-col gap-10 pb-24"
      aria-busy
      aria-label={t.status.loadingReview}
    >
      <div className="grid items-end gap-6 pt-6 sm:grid-cols-[minmax(0,17rem)_1fr] sm:gap-10 sm:pt-10">
        <div className="aspect-square w-56 rounded-2xl bg-ink-800 sm:w-full" />
        <div className="flex flex-col gap-4">
          <div className="h-3 w-16 rounded bg-ink-800" />
          <div className="h-12 w-3/4 rounded bg-ink-800" />
          <div className="h-6 w-1/3 rounded bg-ink-800" />
        </div>
      </div>
      <div className="flex flex-col gap-4 rounded-card border border-ink-700 bg-ink-900/70 p-6 sm:p-8">
        <div className="h-3 w-24 rounded bg-ink-800" />
        <div className="h-20 w-48 rounded bg-ink-800" />
        <div className="h-4 w-2/3 rounded bg-ink-800" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-14 rounded-xl bg-ink-900" />
        ))}
      </div>
    </div>
  );
}
