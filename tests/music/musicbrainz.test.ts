import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMusicBrainz,
  createThrottle,
  mapMbTracks,
  MbReleaseSchema,
  pickRelease,
} from "@/lib/music/providers/musicbrainz";
import browse from "../fixtures/musicbrainz/browse-greg-guidry.json";
import release from "../fixtures/musicbrainz/release-greg-guidry.json";
import search from "../fixtures/musicbrainz/search-greg-guidry.json";
import { fetchedUrls, mockFetch } from "../helpers/mock-fetch";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const GROUP = "08e3fae7-b9c9-3d70-9657-4b620d547d5d";
const mb = () => createMusicBrainz(0);

describe("musicbrainz.searchAlbums", () => {
  it("searches release groups (one per album) and identifies itself", async () => {
    const fetch = mockFetch([{ match: "/ws/2/release-group", body: search }]);
    const results = await mb().searchAlbums("greg guidry over the line");

    expect(fetchedUrls(fetch)[0]).toBe(
      "https://musicbrainz.org/ws/2/release-group?query=greg%20guidry%20over%20the%20line&dismax=true&fmt=json&limit=25",
    );
    const headers = new Headers(fetch.mock.calls[0][1]?.headers);
    expect(headers.get("user-agent")).toMatch(/^musicaso\/.+github\.com/);
    expect(results[0]).toEqual({
      source: "mb",
      id: GROUP,
      title: "Over the Line",
      artist: "Greg Guidry",
      year: 1982,
      coverThumbUrl: `https://coverartarchive.org/release-group/${GROUP}/front-500`,
      recordType: "album",
    });
  });

  it("leaves out singles", async () => {
    mockFetch([{ match: "/ws/2/release-group", body: search }]);
    const results = await mb().searchAlbums("greg");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.recordType !== "single")).toBe(true);
  });

  it("treats 503 as rate limiting, after one retry", async () => {
    const fetch = mockFetch([{ match: "/ws/2/", status: 503, body: {} }]);
    await expect(mb().searchAlbums("x")).rejects.toMatchObject({ code: "rate_limited" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("recovers when the retry gets through", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ++calls === 1
          ? new Response("{}", { status: 503 })
          : Response.json({ "release-groups": [] }),
      ),
    );
    await expect(mb().searchAlbums("x")).resolves.toEqual([]);
    expect(calls).toBe(2);
  });
});

describe("musicbrainz.getAlbum", () => {
  it("loads the representative release of the group", async () => {
    const fetch = mockFetch([
      { match: `/ws/2/release?release-group=${GROUP}`, body: browse },
      { match: "/ws/2/release/d13d490b", body: release },
    ]);
    const album = await mb().getAlbum(GROUP);

    expect(fetchedUrls(fetch)[1]).toContain(
      "/release/d13d490b-320c-4ed6-ba25-edea28ff1259?inc=recordings+artist-credits+release-groups+genres",
    );
    expect(album).toMatchObject({
      source: "mb",
      id: GROUP,
      title: "Over the Line",
      artist: "Greg Guidry",
      year: 1982,
      genre: "Pop",
      recordType: "album",
      coverUrl: `https://coverartarchive.org/release-group/${GROUP}/front-1200`,
      externalUrl: `https://musicbrainz.org/release-group/${GROUP}`,
    });
    expect(album.tracks).toHaveLength(10);
    expect(album.tracks[0]).toMatchObject({ position: 1, disc: 1, durationSec: 220 });
    expect(album.tracks.every((t) => t.previewUrl === undefined)).toBe(true);
  });

  it("has no cover when no release in the group has art", async () => {
    const bare = {
      releases: browse.releases.map((r) => ({
        ...r,
        "cover-art-archive": { ...r["cover-art-archive"], front: false },
      })),
    };
    mockFetch([
      { match: "/ws/2/release?release-group=", body: bare },
      { match: "/ws/2/release/", body: release },
    ]);
    const album = await mb().getAlbum(GROUP);
    expect(album.coverUrl).toBe("");
    expect(album.coverThumbUrl).toBe("");
  });

  it("rejects ids that are not UUIDs without calling the API", async () => {
    const fetch = mockFetch([]);
    await expect(mb().getAlbum("../artist/x")).rejects.toMatchObject({ code: "not_found" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is not_found when the group has no releases", async () => {
    mockFetch([{ match: "/ws/2/release?", body: { releases: [] } }]);
    await expect(mb().getAlbum(GROUP)).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("pickRelease", () => {
  const r = (
    id: string,
    opts: { status?: string; date?: string; formats?: string[]; tracks?: number },
  ) => ({
    id,
    status: opts.status ?? "Official",
    date: opts.date,
    media: (opts.formats ?? ["CD"]).map((format) => ({
      format,
      "track-count": opts.tracks ?? 10,
    })),
  });

  it("prefers official releases with the usual track count, on CD/digital, earliest first", () => {
    const picked = pickRelease([
      r("bootleg", { status: "Bootleg", date: "1970" }),
      r("deluxe", { date: "1975", tracks: 18 }),
      r("vinyl", { date: "1979", formats: ['12" Vinyl'] }),
      r("cd-late", { date: "2001" }),
      r("cd-early", { date: "1990" }),
    ]);
    expect(picked?.id).toBe("cd-early");
  });

  it("is deterministic when everything ties", () => {
    expect(pickRelease([r("b", {}), r("a", {})])?.id).toBe("a");
  });

  it("matches the fixture's choice", () => {
    expect(pickRelease(browse.releases)?.id).toBe("d13d490b-320c-4ed6-ba25-edea28ff1259");
  });
});

describe("mapMbTracks", () => {
  it("orders discs and tracks, skips videos and tolerates missing lengths", () => {
    const parsed = MbReleaseSchema.parse({
      id: "r",
      title: "T",
      "release-group": { id: "g", title: "T" },
      media: [
        {
          position: 2,
          tracks: [
            { id: "d2t2", position: 2, title: "Two-Two", length: null },
            { id: "d2t1", position: 1, title: "Two-One", length: 61_400 },
          ],
        },
        {
          position: 1,
          tracks: [
            { id: "d1t1", position: 1, title: "One-One", length: 120_000 },
            { id: "vid", position: 2, title: "Video", length: 200_000, recording: { video: true } },
          ],
        },
      ],
    });
    expect(mapMbTracks(parsed).map((t) => [t.id, t.position, t.disc, t.durationSec])).toEqual([
      ["d1t1", 1, 1, 120],
      ["d2t1", 2, 2, 61],
      ["d2t2", 3, 2, 0],
    ]);
  });
});

describe("createThrottle", () => {
  const slow = () => new Promise((resolve) => setTimeout(resolve, 100));

  it("spaces network requests at least the gap apart", async () => {
    vi.useFakeTimers();
    const run = createThrottle(1000);
    const started: number[] = [];
    const start = Date.now();
    const task = () => {
      started.push(Date.now() - start);
      return slow();
    };
    void run(task);
    void run(task);
    await vi.advanceTimersByTimeAsync(1200);
    expect(started).toEqual([0, 1000]);
  });

  it("gives the slot back when the answer came from the cache", async () => {
    vi.useFakeTimers();
    const run = createThrottle(1000);
    await run(async () => "cached");
    const started: number[] = [];
    const start = Date.now();
    void run(async () => started.push(Date.now() - start));
    await vi.advanceTimersByTimeAsync(0);
    expect(started).toEqual([0]);
  });
});
