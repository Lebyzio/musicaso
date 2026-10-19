"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "@/lib/i18n";
import { useLocale, useT } from "./locale-provider";

const OPTIONS: { locale: Locale; label: string; name: string }[] = [
  { locale: "en", label: "EN", name: "English" },
  { locale: "th", label: "ไทย", name: "ภาษาไทย" },
];

function storeLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}

/** Stores the choice in a cookie and re-renders the server tree in the new language. */
export function LanguageSwitch() {
  const current = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(locale: Locale) {
    if (locale === current) return;
    storeLocale(locale);
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="radiogroup"
      aria-label={t.nav.language}
      aria-busy={pending}
      className="flex rounded-full border border-ink-700 p-0.5 text-xs"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.locale}
          type="button"
          role="radio"
          aria-checked={current === o.locale}
          aria-label={o.name}
          lang={o.locale}
          onClick={() => choose(o.locale)}
          className="rounded-full px-2.5 py-1 text-paper-mute transition-colors hover:text-paper aria-checked:bg-ink-800 aria-checked:text-paper"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
