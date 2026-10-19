import { afterEach, describe, expect, it, vi } from "vitest";
import { searchAlbums } from "@/lib/music";
import dzSearch from "../fixtures/deezer/search-album.json";
import quota from "../fixtures/deezer/error-quota.json";
import empty from "../fixtures/itunes/empty.json";
import itSearch from "../fixtures/itunes/search-bodyslam-th.json";
import { fetchedUrls, mockFetch } from "../helpers/mock-fetch";

afterEach(() => vi.unstubAllGlobals());

describe("searchAlbums", () => {
  it("uses Deezer when it has results", async () => {
    const fetch = mockFetch([{ match: "api.deezer.com", body: dzSearch }]);
    const res = await searchAlbums("in rainbows");
    expect(res.source).toBe("dz");
    expect(res.results).toHaveLength(3);
    expect(fetchedUrls(fetch).every((u) => u.includes("deezer"))).toBe(true);
  });

  it("falls back to Apple Music when Deezer fails", async () => {
    mockFetch([
      { match: "api.deezer.com", body: quota },
      { match: "itunes.apple.com", body: itSearch },
    ]);
    const res = await searchAlbums("bodyslam");
    expect(res.source).toBe("it");
    expect(res.results).toHaveLength(4);
  });

  it("falls back to Apple Music when Deezer finds nothing", async () => {
    mockFetch([
      { match: "api.deezer.com", body: { data: [], total: 0 } },
      { match: "itunes.apple.com", body: itSearch },
    ]);
    expect((await searchAlbums("bodyslam")).source).toBe("it");
  });

  it("returns Deezer's empty result if the fallback errors", async () => {
    mockFetch([
      { match: "api.deezer.com", body: { data: [], total: 0 } },
      { match: "itunes.apple.com", status: 500, body: {} },
    ]);
    expect(await searchAlbums("zzz")).toEqual({ source: "dz", results: [] });
  });

  it("throws Deezer's error when both sources fail", async () => {
    mockFetch([
      { match: "api.deezer.com", body: quota },
      { match: "itunes.apple.com", status: 500, body: {} },
    ]);
    await expect(searchAlbums("x")).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("only queries the requested source", async () => {
    const fetch = mockFetch([{ match: "itunes.apple.com", body: empty }]);
    expect(await searchAlbums("x", "it")).toEqual({ source: "it", results: [] });
    expect(fetchedUrls(fetch).some((u) => u.includes("deezer"))).toBe(false);
  });
});

describe("searchAlbums with an artist name", () => {
  it("adds the discography and drops its albums from the regular results", async () => {
    const discography = {
      data: [{ id: dzSearch.data[0].id, title: dzSearch.data[0].title, fans: 9 }],
    };
    mockFetch([
      { match: "/search/artist", body: { data: [{ id: 7, name: "Radiohead" }] } },
      { match: "/artist/7/albums", body: discography },
      { match: "/search/album", body: dzSearch },
    ]);
    const res = await searchAlbums("radiohead");
    expect(res.artist?.name).toBe("Radiohead");
    expect(res.artist?.albums).toHaveLength(1);
    expect(res.results).toHaveLength(2);
    expect(res.results.some((a) => a.id === String(dzSearch.data[0].id))).toBe(false);
  });

  it("still returns results when the artist lookup fails", async () => {
    mockFetch([
      { match: "/search/artist", status: 500, body: {} },
      { match: "/search/album", body: dzSearch },
    ]);
    const res = await searchAlbums("radiohead", "dz");
    expect(res.artist).toBeUndefined();
    expect(res.results).toHaveLength(3);
  });
});
