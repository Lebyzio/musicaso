import { cookies, headers } from "next/headers";
import { cache } from "react";
import { getDictionary, LOCALE_COOKIE, type Locale, pickLocale } from ".";

/**
 * The visitor's UI language, from the language-switch cookie or Accept-Language.
 * Reading request data makes the calling route dynamic.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const [jar, list] = await Promise.all([cookies(), headers()]);
  return pickLocale(jar.get(LOCALE_COOKIE)?.value, list.get("accept-language"));
});

/** The dictionary for the visitor's language, for Server Components. */
export async function getT() {
  return getDictionary(await getLocale());
}
