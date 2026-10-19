import { describe, expect, it } from "vitest";
import { clearDraft, draftKey, loadDraft, saveDraft } from "@/lib/draft";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
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
      updatedAt: 123,
      mismatch: false,
    });
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
