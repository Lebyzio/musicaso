import type { CSSProperties } from "react";
import type { CardFormat, CardPalette } from "@/lib/card/themes";
import { CARD_FONT } from "@/lib/fonts";
import type { Dictionary } from "@/lib/i18n";
import { formatScore } from "@/lib/score";
import { hasThai } from "@/lib/text";
import { CoverArt } from "./cover-art";

// Satori rules: every element with more than one child needs display:flex, no grid, inline styles only.

export interface ListCardEntry {
  rank: number;
  title: string;
  artist: string;
  year?: number;
  score: number | null;
  /** Cover as a data URI (lib/cover-image.ts), or null for a blank tile. */
  cover: string | null;
}

interface ListCardProps {
  title: string;
  name: string | undefined;
  entries: ListCardEntry[];
  format: CardFormat;
  palette: CardPalette;
  t: Dictionary;
}

/** Uppercase + tracking for Latin only — Satori misplaces Thai tone marks when letter-spaced. */
function kicker(text: string): CSSProperties {
  return hasThai(text) ? {} : { letterSpacing: 6, textTransform: "uppercase" };
}

const ellipsis: CSSProperties = {
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

/** "Top 10 · by Alex" — kept apart so each part gets its own script's styling. */
export function ListKicker({
  count,
  name,
  t,
  color,
  size,
}: {
  count: number;
  name: string | undefined;
  t: Dictionary;
  color: string;
  size: number;
}) {
  const top = t.image.topN(count);
  const by = name ? t.image.listBy(name) : null;
  return (
    <div style={{ display: "flex", gap: 14, fontSize: size, color }}>
      <span style={kicker(top)}>{top}</span>
      {by && <span>·</span>}
      {by && <span style={kicker(by)}>{by}</span>}
    </div>
  );
}

export function ListTitle({ title, size, color }: { title: string; size: number; color: string }) {
  return (
    <div
      style={{
        display: "block",
        lineClamp: 2,
        fontFamily: CARD_FONT.display,
        fontSize: size,
        lineHeight: hasThai(title) ? 1.35 : 1.05,
        color,
      }}
    >
      {title}
    </div>
  );
}

function Brand({ palette, size }: { palette: CardPalette; size: number }) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: CARD_FONT.display,
        fontStyle: "italic",
        fontSize: size,
        color: palette.fg,
      }}
    >
      musicaso<span style={{ color: palette.score }}>.</span>
    </div>
  );
}

/** Story: one row per album. */
function StoryRows({ entries, palette }: { entries: ListCardEntry[]; palette: CardPalette }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {entries.map((e) => (
        <div key={e.rank} style={{ display: "flex", alignItems: "center", gap: 24, height: 106 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              width: 70,
              fontFamily: CARD_FONT.display,
              fontWeight: 600,
              fontSize: 48,
              color: palette.score,
            }}
          >
            {e.rank}
          </div>
          <CoverArt src={e.cover} size={106} radius={10} placeholder={palette.barTrack} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minWidth: 0,
              gap: 4,
            }}
          >
            <span style={{ ...ellipsis, fontSize: 34, color: palette.fg }}>{e.title}</span>
            <span style={{ ...ellipsis, fontSize: 26, color: palette.mute }}>
              {e.year ? `${e.artist} · ${e.year}` : e.artist}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              width: 120,
              fontFamily: CARD_FONT.display,
              fontWeight: 600,
              fontSize: 50,
              color: palette.score,
            }}
          >
            {formatScore(e.score)}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Square: a wall of covers, five to a row, with rank and score. */
function SquareGrid({ entries, palette }: { entries: ListCardEntry[]; palette: CardPalette }) {
  const size = 168; // five across fill the 936px content width
  const rows = [entries.slice(0, 5), entries.slice(5, 10)].filter((row) => row.length > 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
      {rows.map((row, r) => (
        <div key={r} style={{ display: "flex", gap: 24 }}>
          {row.map((e) => (
            <div
              key={e.rank}
              style={{ display: "flex", flexDirection: "column", width: size, gap: 10 }}
            >
              <div style={{ display: "flex", position: "relative", width: size, height: size }}>
                <CoverArt src={e.cover} size={size} radius={12} placeholder={palette.barTrack} />
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    background: palette.bg,
                    color: palette.score,
                    fontFamily: CARD_FONT.display,
                    fontWeight: 600,
                    fontSize: 26,
                  }}
                >
                  {e.rank}
                </div>
              </div>
              <span style={{ ...ellipsis, fontSize: 22, color: palette.fg }}>{e.title}</span>
              <span
                style={{
                  fontFamily: CARD_FONT.display,
                  fontWeight: 600,
                  fontSize: 34,
                  color: palette.score,
                  lineHeight: 1,
                }}
              >
                {formatScore(e.score)}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListCard({ title, name, entries, format, palette, t }: ListCardProps) {
  const story = format === "story";
  const pad = story ? 96 : 72;

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: pad,
        background: palette.bg,
        ...(palette.glow && {
          backgroundImage: `radial-gradient(circle at 20% 8%, ${palette.glow}44 0%, ${palette.bg} 55%)`,
        }),
        color: palette.fg,
        fontFamily: CARD_FONT.body,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: story ? 56 : 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <ListKicker
            count={entries.length}
            name={name}
            t={t}
            color={palette.score}
            size={story ? 26 : 24}
          />
          <ListTitle title={title} size={story ? 76 : 64} color={palette.fg} />
        </div>
        {story ? (
          <StoryRows entries={entries} palette={palette} />
        ) : (
          <SquareGrid entries={entries} palette={palette} />
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Brand palette={palette} size={story ? 44 : 38} />
        <span style={{ fontSize: 22, color: palette.mute }}>{t.list.albums(entries.length)}</span>
      </div>
    </div>
  );
}
