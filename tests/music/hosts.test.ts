import { describe, expect, it } from "vitest";
import { isAllowedImageUrl } from "@/lib/music/hosts";

describe("isAllowedImageUrl", () => {
  it.each([
    "https://cdn-images.dzcdn.net/images/cover/abc/1000x1000-000000-80-0-0.jpg",
    "https://e-cdns-images.dzcdn.net/images/cover/abc/250x250.jpg",
    "https://is1-ssl.mzstatic.com/image/thumb/x/1000x1000bb.jpg",
    "https://coverartarchive.org/release/abc/front",
    "https://archive.org/download/mbid-x/mbid-x-1_thumb250.jpg",
    "https://dn721205.ca.archive.org/0/items/mbid-x/mbid-x-1_thumb250.jpg",
  ])("allows %s", (url) => {
    expect(isAllowedImageUrl(url)).toBe(true);
  });

  it.each([
    ["plain http", "http://cdn-images.dzcdn.net/a.jpg"],
    ["unknown host", "https://evil.com/a.jpg"],
    ["allowed host only in the query", "https://evil.com/?x=cdn-images.dzcdn.net"],
    ["allowed host as a prefix", "https://cdn-images.dzcdn.net.evil.com/a.jpg"],
    ["suffix without a dot boundary", "https://evilmzstatic.com/a.jpg"],
    ["bare wildcard domain", "https://mzstatic.com/a.jpg"],
    ["look-alike of archive.org", "https://notarchive.org/a.jpg"],
    ["credentials", "https://user:pass@cdn-images.dzcdn.net/a.jpg"],
    ["custom port", "https://cdn-images.dzcdn.net:8443/a.jpg"],
    ["not a URL", "cdn-images.dzcdn.net/a.jpg"],
  ])("rejects %s", (_, url) => {
    expect(isAllowedImageUrl(url)).toBe(false);
  });
});
