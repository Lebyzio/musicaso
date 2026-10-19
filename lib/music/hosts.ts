/**
 * Image hosts we are willing to load or proxy. Single source of truth for
 * `/api/cover` and `images.remotePatterns` in next.config.ts — never an open proxy.
 * `*.` entries match any subdomain (but not the bare domain).
 */
export const IMAGE_HOSTS = [
  "cdn-images.dzcdn.net",
  "e-cdns-images.dzcdn.net",
  "*.mzstatic.com",
  "coverartarchive.org",
  // Cover Art Archive redirects to the Internet Archive (archive.org → ia*/dn*.archive.org).
  "archive.org",
  "*.archive.org",
] as const;

function hostMatches(hostname: string, pattern: string): boolean {
  if (pattern.startsWith("*.")) return hostname.endsWith(pattern.slice(1));
  return hostname === pattern;
}

export function isAllowedImageUrl(input: string | URL): boolean {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port !== "" || url.username || url.password) return false;
  const hostname = url.hostname.toLowerCase();
  return IMAGE_HOSTS.some((pattern) => hostMatches(hostname, pattern));
}
