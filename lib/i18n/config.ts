/** UI languages. English is the default and the fallback for anything else. */
export const LOCALES = ["en", "th"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Set by the language switch; read on the server so the first render is already translated. */
export const LOCALE_COOKIE = "musicaso-lang";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * The cookie wins; otherwise the first supported language in Accept-Language (by q-value),
 * so a Thai browser gets Thai on its first visit. Pure, for tests.
 */
export function pickLocale(cookie: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookie)) return cookie;
  const ranked = (acceptLanguage ?? "")
    .split(",")
    .map((part, order) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { base: tag.split("-")[0], q: q ? Number(q.slice(2)) || 0 : 1, order };
    })
    .filter((l) => l.base && l.q > 0)
    .sort((a, b) => b.q - a.q || a.order - b.order);
  return ranked.map((l) => l.base).find(isLocale) ?? DEFAULT_LOCALE;
}
