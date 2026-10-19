import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/lib/music/errors";
import { deezer } from "@/lib/music/providers/deezer";
import album302127 from "../fixtures/deezer/album-302127.json";
import tracks302127 from "../fixtures/deezer/album-302127-tracks.json";
import album73301852 from "../fixtures/deezer/album-73301852.json";
import sgtPage1 from "../fixtures/deezer/album-73301852-tracks-1.json";
import sgtPage2 from "../fixtures/deezer/album-73301852-tracks-2.json";
import emptyQuery from "../fixtures/deezer/error-empty-query.json";
import notFound from "../fixtures/deezer/error-not-found.json";
import quota from "../fixtures/deezer/error-quota.json";
import search from "../fixtures/deezer/search-album.json";
import { fetchedUrls, mockFetch } from "../helpers/mock-fetch";

afterEach(() => vi.unstubAllGlobals());

describe("deezer.searchAlbums", () => {
  it("maps search results to AlbumSummary", async () => {
    const fetch = mockFetch([{ match: "/search/album", body: search }]);
    const results = await deezer.searchAlbums("in rainbows");

    expect(fetchedUrls(fetch)[0]).toBe(
      "https://api.deezer.com/search/album?q=in%20rainbows&limit=20",
    );
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      source: "dz",
      id: String(search.data[0].id),
      title: search.data[0].title,
      artist: search.data[0].artist.name,
      coverThumbUrl: search.data[0].cover_big,
      trackCount: search.data[0].nb_tracks,
      recordType: "album",
    });
  });

  it("turns an HTTP 200 error body into a ProviderError", async () => {
    mockFetch([{ match: "/search/album", body: emptyQuery }]);
    await expect(deezer.searchAlbums("x")).rejects.toMatchObject({ code: "upstream" });

    mockFetch([{ match: "/search/album", body: quota }]);
    await expect(deezer.searchAlbums("x")).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("rejects responses that do not match the schema", async () => {
    mockFetch([{ match: "/search/album", body: { data: [{ id: "nope" }] } }]);
    await expect(deezer.searchAlbums("x")).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("maps HTTP failures", async () => {
    mockFetch([{ match: "/search/album", status: 503, body: {} }]);
    await expect(deezer.searchAlbums("x")).rejects.toBeInstanceOf(ProviderError);
  });
});

describe("deezer.getAlbum", () => {
  it("maps album metadata and tracks", async () => {
    mockFetch([
      { match: "/album/302127/tracks", body: tracks302127 },
      { match: "/album/302127", body: album302127 },
    ]);
    const album = await deezer.getAlbum("302127");

    expect(album).toMatchObject({
      source: "dz",
      id: "302127",
      title: album302127.title,
      artist: album302127.artist.name,
      year: Number(album302127.release_date.slice(0, 4)),
      coverUrl: album302127.cover_xl,
      coverThumbUrl: album302127.cover_big,
      genre: album302127.genres.data[0].name,
      recordType: "album",
      externalUrl: album302127.link,
    });
    expect(album.tracks).toHaveLength(tracks302127.data.length);
    expect(album.tracks[0]).toEqual({
      id: String(tracks302127.data[0].id),
      position: 1,
      disc: 1,
      title: tracks302127.data[0].title,
      durationSec: tracks302127.data[0].duration,
      previewUrl: `/api/preview/dz/${tracks302127.data[0].id}`,
      explicit: false,
    });
  });

  it("leaves previewUrl undefined when Deezer has no preview", async () => {
    mockFetch([
      { match: "/album/302127/tracks", body: tracks302127 },
      { match: "/album/302127", body: album302127 },
    ]);
    const album = await deezer.getAlbum("302127");
    expect(album.tracks[1].previewUrl).toBeUndefined();
  });

  it("follows track pagination and orders a multi-disc album by disc then position", async () => {
    // Serve the pages out of order to prove sorting does not depend on response order.
    const fetch = mockFetch([
      { match: "/album/73301852/tracks?limit=100&index=50", body: sgtPage2 },
      {
        match: "/album/73301852/tracks?limit=100",
        body: {
          ...sgtPage1,
          data: [...sgtPage1.data].reverse(),
          next: "https://api.deezer.com/album/73301852/tracks?limit=100&index=50",
        },
      },
      { match: "/album/73301852", body: album73301852 },
    ]);
    const album = await deezer.getAlbum("73301852");

    expect(fetchedUrls(fetch).filter((u) => u.includes("/tracks"))).toHaveLength(2);
    expect(album.tracks).toHaveLength(65);
    expect(album.tracks.map((t) => t.position)).toEqual(
      Array.from({ length: 65 }, (_, i) => i + 1),
    );
    const discs = album.tracks.map((t) => t.disc);
    expect(discs).toEqual([...discs].sort((a, b) => a - b));
    expect(new Set(discs).size).toBeGreaterThan(1);
  });

  it("does not follow pagination links to other hosts", async () => {
    const fetch = mockFetch([
      {
        match: "/album/302127/tracks",
        body: { ...tracks302127, next: "https://evil.example/album/302127/tracks?index=100" },
      },
      { match: "/album/302127", body: album302127 },
    ]);
    await deezer.getAlbum("302127");
    expect(fetchedUrls(fetch).some((u) => u.includes("evil.example"))).toBe(false);
  });

  it("maps Deezer's 'no data' error to not_found", async () => {
    mockFetch([{ match: "/album/", body: notFound }]);
    await expect(deezer.getAlbum("999999999999")).rejects.toMatchObject({ code: "not_found" });
  });

  it("rejects non-numeric ids without calling the API", async () => {
    const fetch = mockFetch([]);
    await expect(deezer.getAlbum("../track/1")).rejects.toMatchObject({ code: "not_found" });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("deezer.getFreshPreviewUrl", () => {
  it("returns the signed preview URL without using the Data Cache", async () => {
    const fetch = mockFetch([
      {
        match: "/track/3135553",
        body: { id: 3135553, preview: "https://cdnt-preview.dzcdn.net/x.mp3" },
      },
    ]);
    await expect(deezer.getFreshPreviewUrl("3135553")).resolves.toBe(
      "https://cdnt-preview.dzcdn.net/x.mp3",
    );
    expect(fetch.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  it("throws not_found when the track has no preview", async () => {
    mockFetch([{ match: "/track/1", body: { id: 1, preview: "" } }]);
    await expect(deezer.getFreshPreviewUrl("1")).rejects.toMatchObject({ code: "not_found" });
  });
});
