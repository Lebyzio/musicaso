import type { Metadata } from "next";
import { LibraryView } from "@/components/library/library-view";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  // Personal and empty for crawlers (the reviews live in the visitor's browser).
  return { title: t.library.title, description: t.library.description, robots: { index: false } };
}

export default async function LibraryPage() {
  const t = await getT();
  return (
    <div className="flex flex-col gap-8 pt-10 pb-24 sm:pt-16">
      <header className="flex flex-col gap-4">
        <p className="text-xs tracking-[0.25em] text-accent uppercase">{t.library.kicker}</p>
        <h1 className="font-display text-5xl tracking-tight sm:text-6xl">{t.library.title}</h1>
        <p className="max-w-xl text-paper-dim">{t.library.lead}</p>
      </header>
      <LibraryView />
    </div>
  );
}
