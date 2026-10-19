import { encode } from "jpeg-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ACCENT_PAIR, getAlbumAccent } from "@/lib/accent";
import { contrastRatio, PAGE_BG, type RGB } from "@/lib/color";
import { coverAtSize } from "@/lib/music/cover";
import { fetchedUrls, mockFetch } from "./helpers/mock-fetch";

afterEach(() => vi.unstubAllGlobals());

const DZ =
  "https://cdn-images.dzcdn.net/images/cover/a175af9b7d329bc678cb4d26fc13d6de/1000x1000-000000-80-0-0.jpg";
const IT =
  "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/7c/8a/31/x/888332972390.jpg/1000x1000bb.jpg";

function solidJpeg([r, g, b]: RGB, size = 16): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < data.length; i += 4) data.set([r, g, b, 255], i);
  return new Uint8Array(encode({ width: size, height: size, data }, 95).data);
}

const hexToRgb = (hex: string): RGB =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as unknown as RGB;

describe("coverAtSize", () => {
  it("resizes Deezer and mzstatic cover URLs", () => {
    expect(coverAtSize(DZ, 64)).toBe(DZ.replace("1000x1000-", "64x64-"));
    expect(coverAtSize(IT, 64)).toBe(IT.replace("1000x1000bb", "64x64bb"));
  });

  it("leaves unknown URLs alone", () => {
    const caa = "https://coverartarchive.org/release/abc/front";
    expect(coverAtSize(caa, 64)).toBe(caa);
  });
});

describe("getAlbumAccent", () => {
  it("decodes the small cover and returns an AA-safe accent", async () => {
    const fetch = mockFetch([
      {
        match: "64x64-",
        body: solidJpeg([30, 70, 200]),
        headers: { "content-type": "image/jpeg" },
      },
    ]);
    const { accent, ink } = await getAlbumAccent(DZ);
    expect(fetchedUrls(fetch)[0]).toContain("/64x64-");
    const rgb = hexToRgb(accent);
    expect(rgb[2]).toBeGreaterThan(rgb[0]); // still blue
    expect(contrastRatio(rgb, PAGE_BG)).toBeGreaterThanOrEqual(4.5);
    expect(ink).toMatch(/^#[0-9a-f]{6}$/);
  });

  it.each([
    ["an HTTP error", { status: 404, body: {} }],
    ["a non-JPEG body", { body: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) }],
    ["a corrupt JPEG", { body: new Uint8Array([0xff, 0xd8, 0xff, 0x00, 1, 2, 3]) }],
  ])("falls back to the default accent on %s", async (_, route) => {
    mockFetch([{ match: "64x64bb", ...route }]);
    await expect(getAlbumAccent(IT)).resolves.toEqual(DEFAULT_ACCENT_PAIR);
  });

  it("never fetches hosts outside the allowlist", async () => {
    const fetch = mockFetch([]);
    await expect(getAlbumAccent("https://evil.com/1000x1000bb.jpg")).resolves.toEqual(
      DEFAULT_ACCENT_PAIR,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
