import { type Locale } from "./config";
import { type Dictionary, en } from "./dictionaries/en";
import { th } from "./dictionaries/th";

export const DICTIONARIES: Record<Locale, Dictionary> = { en, th };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export * from "./config";
export type { Dictionary };
