import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, it } from "vitest";
import { decodePayload } from "@/lib/share/codec";
import {
  buildList,
  decodeList,
  encodeList,
  fitListUrl,
  listItemReview,
  listPath,
} from "@/lib/share/list-codec";
import type { ListPayload } from "@/lib/share/list-schema";

const full: ListPayload = {
  v: 1,
  n: "ผู้ฟังที่นี่",
  t: "อัลบั้มแห่งปี 2026 ของฉัน",
  l: "th",
  i: [
    { s: "dz", a: "14880659", k: 10, r: "gke_d2....", w: 1 },
    { s: "it", a: "1792752791", k: 3, r: "kk_" },
    { s: "mb", a: "08e3fae7-b9c9-3d70-9657-4b620d547d5d", k: 2, r: "g." },
  ],
};

const raw = (data: unknown) => compressToEncodedURIComponent(JSON.stringify(data));

describe("list encode / decode", () => {
  it("round-trips every field", () => {
    expect(decodeList(encodeList(full))).toEqual({ ok: true, payload: full });
  });

  it("round-trips a minimal list", () => {
    const minimal: ListPayload = { v: 1, i: [{ s: "dz", a: "1", k: 1, r: "k" }] };
    expect(decodeList(encodeList(minimal))).toEqual({ ok: true, payload: minimal });
  });

  it("handles percent-encoded route params", () => {
    expect(decodeList(encodeURIComponent(encodeList(full)))).toMatchObject({ ok: true });
  });

  it.each([
    ["empty", "", "empty"],
    ["garbage", "%%%not-lz", "corrupt"],
    ["a review link", encodeList(full).slice(0, 10), "corrupt"],
    ["a newer version", raw({ ...full, v: 2 }), "unsupported_version"],
    ["no items", raw({ v: 1, i: [] }), "invalid"],
    [
      "more than 10 items",
      raw({
        v: 1,
        i: Array.from({ length: 11 }, (_, i) => ({ s: "dz", a: String(i), k: 1, r: "k" })),
      }),
      "invalid",
    ],
    ["the same album twice", raw({ v: 1, i: [full.i[0], full.i[0]] }), "invalid"],
    ["a title over 60 characters", raw({ ...full, t: "x".repeat(61) }), "invalid"],
  ])("rejects %s", (_, encoded, reason) => {
    expect(decodeList(encoded)).toEqual({ ok: false, reason });
  });

  it("refuses to encode a list with duplicates", () => {
    expect(() => encodeList({ v: 1, i: [full.i[0], full.i[0]] })).toThrow(RangeError);
  });
});

describe("buildList", () => {
  it("encodes ratings, drops defaults and keeps the order", () => {
    const list = buildList({
      name: "  Alex ",
      title: "",
      locale: "en",
      items: [
        { source: "dz", albumId: "2", ratings: [20, "skip", null], weighted: true },
        { source: "dz", albumId: "1", ratings: [10] },
      ],
    });
    expect(list).toEqual({
      v: 1,
      n: "Alex",
      i: [
        { s: "dz", a: "2", k: 3, r: "k_.", w: 1 },
        { s: "dz", a: "1", k: 1, r: "a" },
      ],
    });
    expect(
      buildList({ locale: "th", items: [{ source: "dz", albumId: "x", ratings: [] }] }).l,
    ).toBe("th");
  });
});

describe("fitListUrl", () => {
  const big: ListPayload = {
    v: 1,
    n: "Alex",
    t: "My 2026 in albums",
    i: Array.from({ length: 10 }, (_, i) => ({
      s: "dz",
      a: String(70000000 + i * 7919),
      k: 65,
      r: Array.from({ length: 65 }, (_, j) => "0123456789abcdefghijk_."[(i * 7 + j * 5) % 23]).join(
        "",
      ),
    })),
  };

  it("fits ten 65-track albums well under the limit", () => {
    const fit = fitListUrl("https://musicaso.vercel.app", big);
    expect(fit).toMatchObject({ truncated: false, tooLong: false });
    expect(fit.url.length).toBeLessThan(1800);
  });

  it("shortens the title before giving up", () => {
    const fit = fitListUrl(
      "https://musicaso.vercel.app",
      big,
      listPath({ ...big, t: undefined }).length + 40,
    );
    expect(fit.truncated).toBe(true);
    expect(fit.tooLong).toBe(false);
  });
});

describe("listItemReview", () => {
  it("turns an entry into a review by the list's author", () => {
    const review = listItemReview(full, 0);
    expect(review).toEqual({
      v: 1,
      s: "dz",
      a: "14880659",
      k: 10,
      r: "gke_d2....",
      n: "ผู้ฟังที่นี่",
      w: 1,
      l: "th",
    });
    expect(decodePayload(compressToEncodedURIComponent(JSON.stringify(review)))).toMatchObject({
      ok: true,
    });
  });
});
