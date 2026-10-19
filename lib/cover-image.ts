import { isAllowedImageUrl } from "./music/hosts";
import { coverAtSize } from "./music/cover";

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Cover as a data URI sized for an image render. Satori would otherwise download the full
 * 1000px cover on every render; this goes through the Data Cache and only fetches what the
 * card actually draws. Returns null when the cover can't be loaded (the card shows a blank tile).
 */
export async function coverDataUri(coverUrl: string, px: number): Promise<string | null> {
  if (!coverUrl) return null;
  const url = coverAtSize(coverUrl, px);
  if (!isAllowedImageUrl(url)) return null;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 86400 },
    });
    const type = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!res.ok || !/^image\/(jpeg|png|webp)$/.test(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX_BYTES) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}
