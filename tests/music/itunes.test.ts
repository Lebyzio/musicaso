import { afterEach, describe, expect, it, vi } from "vitest";
import { itunes, resizeArtwork, splitRecordType } from "@/lib/music/providers/itunes";
import empty from "../fixtures/itunes/empty.json";
import whiteAlbum from "../fixtures/itunes/lookup-1441133180-us.json";
import khram from "../fixtures/itunes/lookup-1792752791-th.json";
import search from "../fixtures/itunes/search-bodyslam-th.json";
import { fetchedUrls, mockFetch } from "../helpers/mock-fetch";

afterEach(() => vi.unstubAllGlobals());

describe("helpers", () => {
  it("resizes artwork URLs", () => {
    expect(
      resizeArtwork("https://is1-ssl.mzstatic.com/image/thumb/a/b.jpg/100x100bb.jpg", 1000),
    ).toBe("https://is1-ssl.mzstatic.com/image/thumb/a/b.jpg/1000x1000bb.jpg");
    expect(resizeArtwork(undefined, 500)).toBe("");
  });

  it("splits ' - Single' / ' - EP' suffixes into recordType", () => {
    expect(splitRecordType({ collectionName: "แสงสวรรค์ - Single" })).toEqual({
      title: "แสงสวรรค์",
      recordType: "single",
    });
    expect(splitRecordType({ collectionName: "Something - EP" })).toEqual({
      title: "Something",
      recordType: "ep",
    });
    expect(splitRecordType({ collectionName: "Now 100", collectionType: "Compilation" })).toEqual({
      title: "Now 100",
      recordType: "compilation",
    });
    expect(splitRecordType({ collectionName: "Rock - Paper - Scissors" })).toEqual({
      title: "Rock - Paper - Scissors",
      recordType: "album",
    });
  });
});

describe("itunes.searchAlbums", () => {
  it("searches the Thai storefront first and maps Thai titles", async () => {
    const fetch = mockFetch([{ match: "country=th", body: search }]);
    const results = await itunes.searchAlbums("bodyslam");

    const url = new URL(fetchedUrls(fetch)[0]);
    expect(url.pathname).toBe("/search");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      term: "bodyslam",
      entity: "album",
      media: "music",
      country: "th",
    });
    expect(results.map((r) => r.title)).toEqual(["believe", "คราม", "save my life", "แสงสวรรค์"]);
    expect(results[1]).toEqual({
      source: "it",
      id: "1792752791",
      title: "คราม",
      artist: "Bodyslam",
      year: 2010,
      coverThumbUrl: expect.stringMatching(/\/500x500bb\.jpg$/),
      trackCount: 10,
      recordType: "album",
    });
    expect(results[3].recordType).toBe("single");
  });

  it("falls back to the US storefront when Thailand has nothing", async () => {
    const fetch = mockFetch([
      { match: "country=th", body: empty },
      { match: "country=us", body: search },
    ]);
    const results = await itunes.searchAlbums("bodyslam");
    expect(fetchedUrls(fetch)).toHaveLength(2);
    expect(results).toHaveLength(4);
  });

  it("maps 403/429 to rate_limited", async () => {
    mockFetch([{ match: "itunes.apple.com", status: 403, body: {} }]);
    await expect(itunes.searchAlbums("x")).rejects.toMatchObject({ code: "rate_limited" });
  });
});

describe("itunes.getAlbum", () => {
  it("maps a Thai album lookup", async () => {
    const fetch = mockFetch([{ match: "country=th", body: khram }]);
    const album = await itunes.getAlbum("1792752791");

    expect(new URL(fetchedUrls(fetch)[0]).searchParams.get("limit")).toBe("200");
    expect(album).toMatchObject({
      source: "it",
      id: "1792752791",
      title: "คราม",
      artist: "Bodyslam",
      year: 2010,
      coverUrl: expect.stringMatching(/\/1000x1000bb\.jpg$/),
      genre: "Rock",
      recordType: "album",
    });
    expect(album.externalUrl).not.toContain("uo=");
    expect(album.tracks).toHaveLength(10);
    expect(album.tracks[0]).toMatchObject({
      position: 1,
      disc: 1,
      title: "คราม",
      durationSec: 293,
      previewUrl: expect.stringMatching(/^https:\/\/audio-ssl\.itunes\.apple\.com\//),
      explicit: false,
    });
  });

  it("drops music videos and orders a multi-disc album by disc then track", async () => {
    mockFetch([{ match: "country=th", body: whiteAlbum }]);
    const album = await itunes.getAlbum("1441133180");

    const songCount = whiteAlbum.results.filter(
      (r) => r.wrapperType === "track" && "kind" in r && r.kind === "song",
    ).length;
    expect(album.tracks).toHaveLength(songCount);
    const keys = album.tracks.map((t) => t.disc * 1000 + t.position);
    expect(keys).toEqual([...keys].sort((a, b) => a - b));
    expect(album.tracks.map((t) => t.position)).toEqual(
      Array.from({ length: songCount }, (_, i) => i + 1),
    );
    expect(new Set(album.tracks.map((t) => t.disc)).size).toBeGreaterThan(1);
  });

  it("tries the US storefront when the Thai lookup is empty", async () => {
    mockFetch([
      { match: "country=th", body: empty },
      { match: "country=us", body: whiteAlbum },
    ]);
    await expect(itunes.getAlbum("1441133180")).resolves.toMatchObject({ id: "1441133180" });
  });

  it("throws not_found when no storefront has the album", async () => {
    mockFetch([{ match: "itunes.apple.com", body: empty }]);
    await expect(itunes.getAlbum("1")).rejects.toMatchObject({ code: "not_found" });
  });
});
