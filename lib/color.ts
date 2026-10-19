/**
 * Album accent colour from cover pixels. Pure: takes RGBA bytes (canvas on the client,
 * an image decoder on the server for the PNG cards) and returns colours that are safe
 * to use on the dark UI.
 */

export type RGB = readonly [number, number, number];

export const PAGE_BG: RGB = [0x0c, 0x0b, 0x0a]; // --color-ink-950
export const PAPER: RGB = [0xf4, 0xef, 0xe6]; // --color-paper
export const DEFAULT_ACCENT: RGB = [0xf2, 0xb3, 0x4b]; // matches --album-accent default

const HUE_BUCKETS = 12;
/** Minimum weighted share of opaque pixels (per-pixel weight ≤ 1) a hue needs to beat the default. */
const MIN_WEIGHTED_SHARE = 0.015;

const rgb = (r: number, g: number, b: number): RGB => [Math.round(r), Math.round(g), Math.round(b)];

export function toHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s, l];
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1
      ? [c, x, 0]
      : hp < 2
        ? [x, c, 0]
        : hp < 3
          ? [0, c, x]
          : hp < 4
            ? [0, x, c]
            : hp < 5
              ? [x, 0, c]
              : [c, 0, x];
  const m = l - c / 2;
  return rgb((r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255);
}

function channel(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance([r, g, b]: RGB): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The most prominent *vivid* colour: pixels are bucketed by hue and weighted by saturation,
 * ignoring near-black, near-white and greyish pixels. Mostly-monochrome covers get the default.
 */
export function pickAccent(rgba: ArrayLike<number>): RGB {
  const buckets = Array.from({ length: HUE_BUCKETS }, () => ({ weight: 0, r: 0, g: 0, b: 0 }));
  let opaque = 0;

  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    opaque++;
    const pixel: RGB = [rgba[i], rgba[i + 1], rgba[i + 2]];
    const [h, s, l] = rgbToHsl(pixel);
    if (s < 0.25 || l < 0.12 || l > 0.9) continue;
    const weight = s * (1 - Math.abs(l - 0.5));
    const bucket = buckets[Math.floor(h / (360 / HUE_BUCKETS)) % HUE_BUCKETS];
    bucket.weight += weight;
    bucket.r += pixel[0] * weight;
    bucket.g += pixel[1] * weight;
    bucket.b += pixel[2] * weight;
  }

  const best = buckets.reduce((a, b) => (b.weight > a.weight ? b : a));
  if (opaque === 0 || best.weight < opaque * MIN_WEIGHTED_SHARE) return DEFAULT_ACCENT;
  return rgb(best.r / best.weight, best.g / best.weight, best.b / best.weight);
}

/** Lighten (keeping hue) until the colour reaches `min` contrast against `bg` — WCAG AA by default. */
export function ensureContrast(color: RGB, bg: RGB = PAGE_BG, min = 4.5): RGB {
  if (contrastRatio(color, bg) >= min) return color;
  const [h, s, l] = rgbToHsl(color);
  const lighter = relativeLuminance(bg) < 0.5;
  for (let step = 1; step <= 50; step++) {
    const nl = lighter ? Math.min(1, l + step * 0.02) : Math.max(0, l - step * 0.02);
    const candidate = hslToRgb(h, s, nl);
    if (contrastRatio(candidate, bg) >= min) return candidate;
  }
  return lighter ? PAPER : PAGE_BG;
}

/** Text colour for content placed on top of the accent. */
export function inkFor(color: RGB): RGB {
  return contrastRatio(color, PAGE_BG) >= contrastRatio(color, PAPER) ? PAGE_BG : PAPER;
}

export function accentFromPixels(rgba: ArrayLike<number>): { accent: string; ink: string } {
  const accent = ensureContrast(pickAccent(rgba));
  return { accent: toHex(accent), ink: toHex(inkFor(accent)) };
}
