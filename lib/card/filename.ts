import type { CardFormat } from "./themes";

const MAX_PART = 40;

/** Filesystem-safe slug that keeps Thai and other letters (only strips what OSes reject). */
export function slugPart(text: string): string {
  const slug = text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/['’`]/g, "") // "Pepper's" → "peppers", not "pepper-s"
    .replace(/[\\/:*?"<>|#%&{}$!@+=]/g, " ")
    .replace(/[\s​-‍]+/g, "-")
    .replace(/[^\p{L}\p{M}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return [...slug].slice(0, MAX_PART).join("").replace(/-$/, "");
}

/** musicaso-radiohead-in-rainbows-story.png */
export function cardFilename(album: { artist: string; title: string }, format: CardFormat): string {
  const parts = [slugPart(album.artist), slugPart(album.title)].filter(Boolean);
  return ["musicaso", ...parts, format].join("-") + ".png";
}
