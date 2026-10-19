import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as album } from "@/app/api/album/[source]/[id]/route";
import { GET as cover } from "@/app/api/cover/route";
import { GET as preview } from "@/app/api/preview/[source]/[trackId]/route";
import { GET as search } from "@/app/api/search/route";
import album302127 from "../fixtures/deezer/album-302127.json";
import tracks302127 from "../fixtures/deezer/album-302127-tracks.json";
import dzSearch from "../fixtures/deezer/search-album.json";
import quota from "../fixtures/deezer/error-quota.json";
import { fetchedUrls, mockFetch } from "../helpers/mock-fetch";

afterEach(() => vi.unstubAllGlobals());

const req = (path: string) => new Request(`http://localhost${path}`);
const DZ_COVER = "https://cdn-images.dzcdn.net/images/cover/abc/1000x1000-000000-80-0-0.jpg";
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

describe("GET /api/search", () => {
  it("returns results with a CDN cache header", async () => {
    mockFetch([{ match: "api.deezer.com", body: dzSearch }]);
    const res = await search(req("/api/search?q=in%20rainbows"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage=3600");
    const body = await res.json();
    expect(body.source).toBe("dz");
    expect(body.results).toHaveLength(3);
  });

  it.each([
    ["missing q", "/api/search"],
    ["blank q", "/api/search?q=%20%20"],
    ["too long", `/api/search?q=${"a".repeat(101)}`],
    ["unknown source", "/api/search?q=x&source=sp"],
  ])("400 for %s", async (_, path) => {
    const fetch = mockFetch([]);
    const res = await search(req(path));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("bad_request");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps provider errors to status codes and never caches them", async () => {
    mockFetch([{ match: "api.deezer.com", body: quota }]);
    const res = await search(req("/api/search?q=x&source=dz"));
    expect(res.status).toBe(429);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await res.json()).error.code).toBe("rate_limited");
  });
});

describe("GET /api/cover", () => {
  it("proxies an allowlisted image with immutable caching", async () => {
    mockFetch([{ match: DZ_COVER, body: JPEG, headers: { "content-type": "image/jpeg" } }]);
    const res = await cover(req(`/api/cover?url=${encodeURIComponent(DZ_COVER)}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(JPEG);
  });

  it.each([
    ["no url", "/api/cover"],
    ["foreign host", `/api/cover?url=${encodeURIComponent("https://evil.com/x.jpg")}`],
    ["http", `/api/cover?url=${encodeURIComponent("http://cdn-images.dzcdn.net/x.jpg")}`],
  ])("400 for %s without fetching", async (_, path) => {
    const fetch = mockFetch([]);
    expect((await cover(req(path))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("follows redirects that stay on the allowlist", async () => {
    const next = "https://e-cdns-images.dzcdn.net/images/cover/abc/x.jpg";
    mockFetch([
      { match: DZ_COVER, status: 302, headers: { location: next } },
      { match: next, body: JPEG, headers: { "content-type": "image/jpeg" } },
    ]);
    expect((await cover(req(`/api/cover?url=${encodeURIComponent(DZ_COVER)}`))).status).toBe(200);
  });

  it("refuses a redirect off the allowlist", async () => {
    const fetch = mockFetch([
      { match: DZ_COVER, status: 302, headers: { location: "http://169.254.169.254/latest" } },
    ]);
    const res = await cover(req(`/api/cover?url=${encodeURIComponent(DZ_COVER)}`));
    expect(res.status).toBe(400);
    expect(fetchedUrls(fetch)).toEqual([DZ_COVER]);
  });

  it("rejects non-image and SVG responses", async () => {
    mockFetch([{ match: DZ_COVER, body: "<svg/>", headers: { "content-type": "image/svg+xml" } }]);
    expect((await cover(req(`/api/cover?url=${encodeURIComponent(DZ_COVER)}`))).status).toBe(502);
  });

  it("rejects images over 5 MB", async () => {
    mockFetch([
      {
        match: DZ_COVER,
        body: JPEG,
        headers: { "content-type": "image/jpeg", "content-length": String(6 * 1024 * 1024) },
      },
    ]);
    expect((await cover(req(`/api/cover?url=${encodeURIComponent(DZ_COVER)}`))).status).toBe(502);
  });
});

describe("GET /api/album/[source]/[id]", () => {
  const ctx = (source: string, id: string) => ({ params: Promise.resolve({ source, id }) });

  it("returns album details without the tracklist, cacheable", async () => {
    mockFetch([
      { match: "/album/302127/tracks", body: tracks302127 },
      { match: "/album/302127", body: album302127 },
    ]);
    const res = await album(req("/api/album/dz/302127"), ctx("dz", "302127"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage=86400");
    const body = await res.json();
    expect(body).toMatchObject({ source: "dz", id: "302127", title: album302127.title });
    expect(body.trackCount).toBe(tracks302127.data.length);
    expect(body).not.toHaveProperty("tracks");
  });

  it("404s for unknown sources without calling a provider", async () => {
    const fetch = mockFetch([]);
    const res = await album(req("/api/album/xx/1"), ctx("xx", "1"));
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("GET /api/preview/[source]/[trackId]", () => {
  const ctx = (source: string, trackId: string) => ({
    params: Promise.resolve({ source, trackId }),
  });

  it("redirects to a fresh Deezer preview without caching", async () => {
    const mp3 = "https://cdnt-preview.dzcdn.net/api/1/1/a/b/c/0/x.mp3?hdnea=exp=1";
    mockFetch([{ match: "/track/3135553", body: { id: 3135553, preview: mp3 } }]);
    const res = await preview(req("/api/preview/dz/3135553"), ctx("dz", "3135553"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(mp3);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("refuses to redirect off Deezer's CDN", async () => {
    mockFetch([{ match: "/track/1", body: { id: 1, preview: "https://evil.com/x.mp3" } }]);
    expect((await preview(req("/api/preview/dz/1"), ctx("dz", "1"))).status).toBe(502);
  });

  it("404s for sources other than Deezer and for tracks without a preview", async () => {
    mockFetch([{ match: "/track/2", body: { id: 2, preview: "" } }]);
    expect((await preview(req("/api/preview/it/1"), ctx("it", "1"))).status).toBe(404);
    expect((await preview(req("/api/preview/dz/2"), ctx("dz", "2"))).status).toBe(404);
  });
});
