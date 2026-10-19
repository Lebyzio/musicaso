import Link from "next/link";
import { LanguageSwitch } from "@/components/i18n/language-switch";
import { getT } from "@/lib/i18n/server";

export async function SiteHeader() {
  const t = await getT();
  return (
    <header
      className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-8"
      style={{ viewTransitionName: "site-header" }}
    >
      <Link href="/" className="font-display text-2xl tracking-tight italic">
        musicaso<span className="text-accent">.</span>
      </Link>
      <div className="flex items-center gap-5">
        <p className="hidden text-xs tracking-[0.2em] text-paper-mute uppercase md:block">
          {t.nav.tagline}
        </p>
        <LanguageSwitch />
      </div>
    </header>
  );
}
