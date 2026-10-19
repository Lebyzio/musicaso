import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, it } from "vitest";
import {
  buildPayload,
  decodePayload,
  encodePayload,
  fitShareUrl,
  sharePath,
  URL_LIMIT,
} from "@/lib/share/codec";
import { decodeRatings } from "@/lib/share/ratings";
import type { ReviewPayload } from "@/lib/share/schema";

const ORIGIN = "https://musicaso.vercel.app";

const full: ReviewPayload = {
  v: 1,
  s: "dz",
  a: "14880659",
  k: 10,
  r: "gke_d2....",
  n: "Alex",
  t: "Warm, restless, perfect. 🌈",
  f: 1,
  th: "vinyl",
  ref: { n: "Sam", r: "ggggg_ggg." },
};

const encodeRaw = (data: unknown) => compressToEncodedURIComponent(JSON.stringify(data));

describe("encode / decode", () => {
  it("round-trips every field", () => {
    expect(decodePayload(encodePayload(full))).toEqual({ ok: true, payload: full });
  });

  it("round-trips Thai names and text", () => {
    const thai = {
      ...full,
      s: "it" as const,
      a: "1792752791",
      n: "ต้น",
      t: "เพลงครามคือที่สุด ฟังกี่ทีก็ขนลุก",
    };
    expect(decodePayload(encodePayload(thai))).toEqual({ ok: true, payload: thai });
  });

  it("round-trips a minimal payload", () => {
    const min: ReviewPayload = { v: 1, s: "it", a: "1", k: 0, r: "" };
    expect(decodePayload(encodePayload(min))).toEqual({ ok: true, payload: min });
  });

  it("drops empty optional fields and trims text", () => {
    const encoded = encodePayload({ ...full, n: "  ", t: "  hi  ", ref: { n: "", r: "a" } });
    const expected: ReviewPayload = { ...full, t: "hi", ref: { r: "a" } };
    delete expected.n;
    expect(decodePayload(encoded)).toStrictEqual({ ok: true, payload: expected });
  });

  it("is deterministic regardless of key order", () => {
    const shuffled = Object.fromEntries(Object.entries(full).reverse()) as ReviewPayload;
    expect(encodePayload(shuffled)).toBe(encodePayload(full));
  });

  it("produces URL-safe path segments", () => {
    expect(sharePath(full)).toMatch(/^\/r\/[A-Za-z0-9+\-$]+$/);
  });

  it("refuses to encode invalid payloads", () => {
    expect(() => encodePayload({ ...full, r: "zz" })).toThrow();
  });
});

describe("decodePayload failures never throw", () => {
  it.each([
    ["empty", "", "empty"],
    ["missing", undefined, "empty"],
    ["garbage", "not-a-payload", "corrupt"],
    ["truncated", encodePayload(full).slice(0, 20), "corrupt"],
    ["huge", "A".repeat(5000), "corrupt"],
    ["not JSON", compressToEncodedURIComponent("{oops"), "corrupt"],
    ["future version", encodeRaw({ ...full, v: 2 }), "unsupported_version"],
    ["bad ratings", encodeRaw({ ...full, r: "xyz" }), "invalid"],
    ["name too long", encodeRaw({ ...full, n: "x".repeat(41) }), "invalid"],
    ["bad album id", encodeRaw({ ...full, a: "../../etc" }), "invalid"],
    ["unknown source", encodeRaw({ ...full, s: "sp" }), "invalid"],
    ["array", encodeRaw([1, 2, 3]), "invalid"],
  ])("%s", (_, input, reason) => {
    expect(decodePayload(input)).toEqual({ ok: false, reason });
  });

  it("strips a nested reference instead of keeping it", () => {
    const nested = encodeRaw({ ...full, ref: { n: "Sam", r: "a", ref: { n: "Old", r: "b" } } });
    const decoded = decodePayload(nested);
    expect(decoded.ok && decoded.payload.ref).toEqual({ n: "Sam", r: "a" });
  });
});

describe("buildPayload", () => {
  it("encodes ratings and fits the reference to the tracklist", () => {
    const p = buildPayload({
      source: "dz",
      albumId: "1",
      ratings: [20, "skip", null],
      name: "Alex",
      reference: { name: "Sam", ratings: [10, 12, 14, 16] },
    });
    expect(p).toEqual({
      v: 1,
      s: "dz",
      a: "1",
      k: 3,
      r: "k_.",
      n: "Alex",
      ref: { n: "Sam", r: "ace" },
    });
    expect(decodeRatings(p.ref!.r)).toHaveLength(3);
  });
});

describe("fitShareUrl", () => {
  const sgt: ReviewPayload = { v: 1, s: "dz", a: "73301852", k: 65, r: "g".repeat(65) };

  it("leaves short URLs alone", () => {
    const res = fitShareUrl(ORIGIN, full);
    expect(res).toMatchObject({ payload: full, truncated: false, tooLong: false });
    expect(res.url).toBe(`${ORIGIN}${sharePath(full)}`);
  });

  it("keeps a 65-track review with a full 280-char text under the limit", () => {
    const res = fitShareUrl(ORIGIN, { ...sgt, n: "Alex", t: "A".repeat(280) });
    expect(res.url.length).toBeLessThanOrEqual(URL_LIMIT);
  });

  it("shortens the review text to fit, marking it with an ellipsis", () => {
    const varied = Array.from({ length: 280 }, (_, i) =>
      String.fromCharCode(0x0e01 + ((i * 7) % 46)),
    ).join("");
    const res = fitShareUrl(ORIGIN, { ...full, t: varied }, 300);
    expect(res.truncated).toBe(true);
    expect(res.tooLong).toBe(false);
    expect(res.url.length).toBeLessThanOrEqual(300);
    expect(res.payload.t?.endsWith("…")).toBe(true);
    expect(varied.startsWith(res.payload.t!.slice(0, -1))).toBe(true);
    const decoded = decodePayload(res.url.slice(`${ORIGIN}/r/`.length));
    expect(decoded.ok && decoded.payload.t).toBe(res.payload.t);
  });

  it("reports tooLong when even the bare ratings exceed the limit", () => {
    const res = fitShareUrl(ORIGIN, { ...full, t: "hello" }, 40);
    expect(res).toMatchObject({ truncated: true, tooLong: true });
    expect(res.payload.t).toBeUndefined();
  });
});
