/**
 * Both cover CDNs serve any size from the same path:
 * Deezer  …/{hash}/1000x1000-000000-80-0-0.jpg
 * mzstatic …/{file}.jpg/1000x1000bb.jpg
 * Unknown URLs are returned unchanged.
 */
export function coverAtSize(url: string, px: number): string {
  const size = `${px}x${px}`;
  if (/\/\d+x\d+-[0-9a-f]{6}-\d+-\d+-\d+\.jpg$/.test(url)) {
    return url.replace(/\/\d+x\d+-/, `/${size}-`);
  }
  if (/\/\d+x\d+bb\.(jpg|png|webp)$/.test(url)) {
    return url.replace(/\/\d+x\d+bb\./, `/${size}bb.`);
  }
  return url;
}
