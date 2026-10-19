import { describe, expect, it } from "vitest";
import {
  clearDraft,
  attachAlbum,
  draftKey,
  listDrafts,
  loadDraft,
  loadReviewerName,
  saveDraft,
  saveReviewerName,
} from "@/lib/draft";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
  };
}

const throwing = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
};

describe("draft storage", () => {
  it("uses the documented key", () => {
    expect(draftKey("dz", "302127")).toBe("musicaso:draft:dz:302127");
  });

  it("round-trips ratings and the weighting option", () => {
    const storage = memoryStorage();
    expect(
      saveDraft("dz", "1", { ratings: [16, "skip", null], weighted: true }, storage, 123),
    ).toBe(true);
    expect(JSON.parse(storage.data.get("musicaso:draft:dz:1")!)).toEqual({
      v: 1,
      k: 3,
      r: "g_.",
      w: true,
      updatedAt: 123,
    });
    expect(loadDraft("dz", "1", 3, storage)).toEqual({
      ratings: [16, "skip", null],
      weighted: true,
      name: "",
      text: "",
      theme: undefined,
      updatedAt: 123,
      mismatch: false,
    });
  });

  it("keeps the reviewer name and text, trimmed", () => {
    const storage = memoryStorage();
    saveDraft(
      "dz",
      "1",
      { ratings: [null], weighted: false, name: " Alex ", text: " wow " },
      storage,
      1,
    );
    expect(loadDraft("dz", "1", 1, storage)).toMatchObject({ name: "Alex", text: "wow" });
  });

  it("keeps a non-default card theme", () => {
    const storage = memoryStorage();
    saveDraft("dz", "1", { ratings: [4], weighted: false, theme: "paper" }, storage);
    expect(loadDraft("dz", "1", 1, storage)?.theme).toBe("paper");
    saveDraft("dz", "1", { ratings: [4], weighted: false, theme: "sleeve" }, storage);
    expect(loadDraft("dz", "1", 1, storage)?.theme).toBeUndefined();
  });

  it("does not keep a draft that only has the (pre-filled) name", () => {
    const storage = memoryStorage();
    saveDraft("dz", "1", { ratings: [null], weighted: false, name: "Alex" }, storage);
    expect(storage.data.size).toBe(0);
  });

  it("remembers the reviewer name across albums", () => {
    const storage = memoryStorage();
    expect(loadReviewerName(storage)).toBe("");
    saveReviewerName("  ต้น  ", storage);
    expect(loadReviewerName(storage)).toBe("ต้น");
    saveReviewerName("   ", storage);
    expect(loadReviewerName(storage)).toBe("ต้น");
    expect(loadReviewerName(throwing)).toBe("");
    expect(() => saveReviewerName("x", throwing)).not.toThrow();
  });

  it("removes the draft instead of saving an empty one", () => {
    const storage = memoryStorage({ "musicaso:draft:dz:1": "x" });
    saveDraft("dz", "1", { ratings: [null, null], weighted: false }, storage);
    expect(storage.data.has("musicaso:draft:dz:1")).toBe(false);
  });

  it("matches by position and flags a changed tracklist", () => {
    const storage = memoryStorage();
    saveDraft("it", "9", { ratings: [20, 18, 16], weighted: false }, storage);
    expect(loadDraft("it", "9", 2, storage)).toMatchObject({ ratings: [20, 18], mismatch: true });
    expect(loadDraft("it", "9", 4, storage)).toMatchObject({
      ratings: [20, 18, 16, null],
      mismatch: true,
    });
  });

  it.each([
    ["not JSON", "{oops"],
    ["wrong version", JSON.stringify({ v: 2, k: 1, r: "a", updatedAt: 1 })],
    ["bad characters", JSON.stringify({ v: 1, k: 1, r: "z", updatedAt: 1 })],
  ])("ignores a corrupt draft (%s)", (_, raw) => {
    expect(loadDraft("dz", "1", 1, memoryStorage({ "musicaso:draft:dz:1": raw }))).toBeNull();
  });

  it("never throws when storage is unavailable", () => {
    expect(loadDraft("dz", "1", 1, throwing)).toBeNull();
    expect(saveDraft("dz", "1", { ratings: [1], weighted: false }, throwing)).toBe(false);
    expect(() => clearDraft("dz", "1", throwing)).not.toThrow();
    expect(loadDraft("dz", "1", 1, null)).toBeNull();
    expect(saveDraft("dz", "1", { ratings: [1], weighted: false }, null)).toBe(false);
  });
});

describe("listDrafts", () => {
  const cover = "https://cdn-images.dzcdn.net/images/cover/abc/500x500-000000-80-0-0.jpg";
  const album = { title: "คราม", artist: "Bodyslam", year: 2010, cover };

  it("lists saved reviews with their album details, newest first", () => {
    const storage = memoryStorage({ "musicaso:name": "Alex", other: "x" });
    saveDraft("dz", "1", { ratings: [20, 10], weighted: false, album }, storage, 1000);
    saveDraft(
      "mb",
      "08e3fae7-b9c9-3d70-9657-4b620d547d5d",
      { ratings: [16, "skip"], weighted: true, score: 8.04, text: "Smooth" },
      storage,
      2000,
    );

    const entries = listDrafts(storage);
    expect(entries.map((e) => e.id)).toEqual(["08e3fae7-b9c9-3d70-9657-4b620d547d5d", "1"]);
    expect(entries[1]).toMatchObject({
      source: "dz",
      album,
      ratings: [20, 10],
      score: 7.5, // computed: no stored score
      updatedAt: 1000,
    });
    expect(entries[0]).toMatchObject({
      source: "mb",
      album: null, // saved before album details were stored
      weighted: true,
      score: 8.04, // the stored (length-weighted) score wins
      text: "Smooth",
    });
  });

  it("keeps album details through loadDraft round trips", () => {
    const storage = memoryStorage();
    saveDraft("dz", "1", { ratings: [20], weighted: false, album }, storage);
    expect(loadDraft("dz", "1", 1, storage)?.ratings).toEqual([20]);
  });

  it("drops cover URLs from hosts we don't serve", () => {
    const storage = memoryStorage();
    saveDraft(
      "dz",
      "1",
      { ratings: [20], weighted: false, album: { ...album, cover: "https://evil.example/x.jpg" } },
      storage,
    );
    expect(listDrafts(storage)[0].album).toEqual({ title: "คราม", artist: "Bodyslam", year: 2010 });
  });

  it("attaches album details without changing ratings or the edit time", () => {
    const storage = memoryStorage();
    saveDraft("dz", "1", { ratings: [20, 10], weighted: false }, storage, 1000);
    expect(attachAlbum("dz", "1", album, storage)).toBe(true);
    expect(listDrafts(storage)[0]).toMatchObject({ album, ratings: [20, 10], updatedAt: 1000 });
    expect(attachAlbum("dz", "missing", album, storage)).toBe(false);
    expect(attachAlbum("dz", "1", album, throwing)).toBe(false);
  });

  it("skips corrupt entries and survives unavailable storage", () => {
    const storage = memoryStorage({
      "musicaso:draft:dz:1": "{oops",
      "musicaso:draft:dz:2": JSON.stringify({ v: 1, k: 1, r: "a", m: { t: 1 }, updatedAt: 1 }),
    });
    expect(listDrafts(storage)).toEqual([]);
    expect(listDrafts(null)).toEqual([]);
    expect(
      listDrafts({
        getItem: () => null,
        key: () => {
          throw new Error("SecurityError");
        },
        length: 1,
      }),
    ).toEqual([]);
  });
});
