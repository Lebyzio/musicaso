/** Cover Art Archive only has fixed thumbnail sizes. */
const CAA_SIZES = [250, 500, 1200] as const;

/**
 * Deezer and mzstatic serve any size from the same path:
 * Deezer  …/{hash}/1000x1000-000000-80-0-0.jpg
 * mzstatic …/{file}.jpg/1000x1000bb.jpg
 * Cover Art Archive (…/front-250|500|1200) gets the smallest size that is at least `px`.
 * Unknown URLs are returned unchanged.
 */
export function coverAtSize(url: string, px: number): string {
  const size = `${px}x${px}`;
  if (/^https:\/\/coverartarchive\.org\/.+\/front(-\d+)?$/.test(url)) {
    const caa = CAA_SIZES.find((s) => s >= px) ?? CAA_SIZES[CAA_SIZES.length - 1];
    return url.replace(/\/front(-\d+)?$/, `/front-${caa}`);
  }
  if (/\/\d+x\d+-[0-9a-f]{6}-\d+-\d+-\d+\.jpg$/.test(url)) {
    return url.replace(/\/\d+x\d+-/, `/${size}-`);
  }
  if (/\/\d+x\d+bb\.(jpg|png|webp)$/.test(url)) {
    return url.replace(/\/\d+x\d+bb\./, `/${size}bb.`);
  }
  return url;
}

/** Shared view-transition name so a cover morphs between search results and the album header. */
export function coverTransitionName(album: { source: string; id: string }): string {
  return `cover-${album.source}-${album.id}`;
}
