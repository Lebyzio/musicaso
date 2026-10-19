/**
 * Loose comparison key for names typed by people vs. names in a catalogue:
 * "The Doobie Brothers", "doobie brothers" and "Doobie Brothers!" all become "doobiebrothers".
 * Non-Latin scripts (Thai) are kept as they are, minus spaces and punctuation.
 */
export function nameKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, (mark) => (/[฀-๿]/.test(mark) ? mark : ""))
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/^the\s+/, "")
    .replace(/[^\p{L}\p{N}\p{M}]/gu, "");
}

/** True when the query names this artist exactly (ignoring case, accents, punctuation, "The"). */
export function isSameName(query: string, name: string): boolean {
  const key = nameKey(query);
  return key.length > 0 && key === nameKey(name);
}
