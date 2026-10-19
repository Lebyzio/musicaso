import { getT } from "@/lib/i18n/server";

export default async function Loading() {
  const t = await getT();
  return (
    <div
      className="flex animate-pulse flex-col gap-10 pt-10 pb-24 sm:pt-16"
      aria-busy
      aria-label={t.list.loading}
    >
      <div className="flex flex-col gap-4">
        <div className="h-3 w-32 rounded bg-ink-800" />
        <div className="h-14 w-3/4 max-w-xl rounded-lg bg-ink-800" />
        <div className="h-10 w-64 rounded-full bg-ink-800" />
      </div>
      <ol className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="h-24 rounded-xl bg-ink-900" />
        ))}
      </ol>
    </div>
  );
}
