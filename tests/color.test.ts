import { describe, expect, it } from "vitest";
import {
  accentFromPixels,
  contrastRatio,
  DEFAULT_ACCENT,
  ensureContrast,
  hslToRgb,
  inkFor,
  PAGE_BG,
  PAPER,
  pickAccent,
  rgbToHsl,
  type RGB,
  toHex,
} from "@/lib/color";

/** RGBA buffer made of [colour, pixelCount] runs. */
function pixels(...runs: [RGB, number][]): Uint8ClampedArray {
  const out: number[] = [];
  for (const [[r, g, b], n] of runs) for (let i = 0; i < n; i++) out.push(r, g, b, 255);
  return new Uint8ClampedArray(out);
}

describe("colour conversions", () => {
  it("round-trips HSL", () => {
    for (const c of [
      [200, 40, 60],
      [12, 180, 90],
      [250, 250, 10],
    ] as RGB[]) {
      const [h, s, l] = rgbToHsl(c);
      hslToRgb(h, s, l).forEach((v, i) => expect(Math.abs(v - c[i])).toBeLessThanOrEqual(1));
    }
  });

  it("computes WCAG contrast", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21);
    expect(contrastRatio(PAGE_BG, PAGE_BG)).toBe(1);
  });

  it("formats hex", () => {
    expect(toHex([242, 179, 75])).toBe("#f2b34b");
  });
});

describe("pickAccent", () => {
  it("prefers a vivid colour over a larger area of grey/black", () => {
    const red: RGB = [200, 30, 40];
    const picked = pickAccent(pixels([[20, 20, 20], 700], [[128, 128, 128], 200], [red, 100]));
    expect(picked).toEqual(red);
  });

  it("picks the dominant hue among vivid ones", () => {
    const blue: RGB = [30, 80, 210];
    expect(pickAccent(pixels([blue, 600], [[220, 180, 30], 400]))).toEqual(blue);
  });

  it("falls back to the default for monochrome covers", () => {
    expect(pickAccent(pixels([[0, 0, 0], 500], [[255, 255, 255], 500]))).toEqual(DEFAULT_ACCENT);
    expect(pickAccent(new Uint8ClampedArray())).toEqual(DEFAULT_ACCENT);
  });

  it("ignores transparent pixels", () => {
    const transparentRed = new Uint8ClampedArray([255, 0, 0, 0, 255, 0, 0, 0]);
    expect(pickAccent(transparentRed)).toEqual(DEFAULT_ACCENT);
  });
});

describe("contrast safety", () => {
  it("lightens dark accents until they pass AA on the page background", () => {
    const navy: RGB = [20, 30, 90];
    const safe = ensureContrast(navy);
    expect(contrastRatio(safe, PAGE_BG)).toBeGreaterThanOrEqual(4.5);
    const [h] = rgbToHsl(safe);
    expect(Math.abs(h - rgbToHsl(navy)[0])).toBeLessThan(3); // same hue family
  });

  it("leaves accents that already pass untouched", () => {
    expect(ensureContrast(DEFAULT_ACCENT)).toEqual(DEFAULT_ACCENT);
  });

  it("chooses readable ink on top of the accent", () => {
    expect(inkFor(DEFAULT_ACCENT)).toEqual(PAGE_BG);
    expect(inkFor([90, 20, 140])).toEqual(PAPER);
  });

  it("produces hex values ready for CSS variables", () => {
    const { accent, ink } = accentFromPixels(pixels([[20, 30, 90], 100]));
    expect(accent).toMatch(/^#[0-9a-f]{6}$/);
    expect(ink).toMatch(/^#[0-9a-f]{6}$/);
  });
});
