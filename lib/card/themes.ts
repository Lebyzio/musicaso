import {
  contrastRatio,
  ensureContrast,
  fromHex,
  inkFor,
  mix,
  PAGE_BG,
  PAPER,
  type RGB,
  toHex,
} from "../color";

export const CARD_FORMATS = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
} as const;

export type CardFormat = keyof typeof CARD_FORMATS;

export const CARD_THEMES = ["sleeve", "paper", "vivid"] as const;
export type CardTheme = (typeof CARD_THEMES)[number];

export function isCardTheme(value: unknown): value is CardTheme {
  return CARD_THEMES.includes(value as CardTheme);
}

/** Every colour a card needs, as hex. All text colours are ≥ 4.5:1 against `bg`. */
export interface CardPalette {
  bg: string;
  /** Soft radial glow behind the cover, or null for flat themes. */
  glow: string | null;
  fg: string;
  dim: string;
  mute: string;
  /** The big score and highlights. */
  score: string;
  barFill: string;
  barTrack: string;
}

const MIN_CONTRAST = 4.5;
const PAPER_INK: RGB = [0x14, 0x13, 0x11];

/** A softened version of `fg` if it stays readable, else `fg` itself. */
function readable(fg: RGB, bg: RGB, towardsBg: number): RGB {
  const softened = mix(fg, bg, towardsBg);
  return contrastRatio(softened, bg) >= MIN_CONTRAST ? softened : fg;
}

export function cardPalette(theme: CardTheme, accentHex: string): CardPalette {
  const accent = fromHex(accentHex);

  if (theme === "paper") {
    const bg = PAPER;
    const score = ensureContrast(accent, bg, MIN_CONTRAST); // darkens on a light background
    return {
      bg: toHex(bg),
      glow: null,
      fg: toHex(PAPER_INK),
      dim: toHex(readable(PAPER_INK, bg, 0.2)),
      mute: toHex(readable(PAPER_INK, bg, 0.35)),
      score: toHex(score),
      barFill: toHex(score),
      barTrack: toHex(mix(PAPER_INK, bg, 0.88)),
    };
  }

  if (theme === "vivid") {
    const bg = accent;
    const fg = inkFor(accent);
    return {
      bg: toHex(bg),
      glow: null,
      fg: toHex(fg),
      dim: toHex(readable(fg, bg, 0.15)),
      mute: toHex(readable(fg, bg, 0.25)),
      score: toHex(fg),
      barFill: toHex(fg),
      barTrack: toHex(mix(fg, bg, 0.75)),
    };
  }

  // sleeve: the dark UI look, tinted by the cover
  const bg = PAGE_BG;
  const score = ensureContrast(accent, bg, MIN_CONTRAST);
  return {
    bg: toHex(bg),
    glow: toHex(score),
    fg: toHex(PAPER),
    dim: "#c9c2b6",
    mute: "#9a9387",
    score: toHex(score),
    barFill: toHex(score),
    barTrack: "#2a2724",
  };
}
