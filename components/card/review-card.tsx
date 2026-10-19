import type { CSSProperties, ReactNode } from "react";
import type { CardPalette, CardFormat } from "@/lib/card/themes";
import type { CardTrackList } from "@/lib/card/tracks";
import { CoverArt } from "./cover-art";
import { CARD_FONT } from "@/lib/fonts";
import { type Album, SOURCE_LABEL } from "@/lib/music/types";
import { formatScore, isScored, type Rating, toScore } from "@/lib/score";
import type { ReviewView } from "@/lib/share/review-view";
import { hasThai } from "@/lib/text";

// Satori rules: every element with more than one child needs display:flex, no grid, inline styles only.

interface ReviewCardProps {
  album: Album;
  view: ReviewView;
  tracks: CardTrackList;
  format: CardFormat;
  palette: CardPalette;
  /** Cover as a data URI (lib/cover-image.ts), or null for a blank tile. */
  cover: string | null;
}

function scoreText(rating: Rating | undefined): string {
  if (rating === "skip") return "skip";
  if (rating === null || rating === undefined) return "–";
  return formatScore(toScore(rating));
}

/** Uppercase + tracking for Latin only — Satori misplaces Thai tone marks when letter-spaced. */
function kicker(text: string): CSSProperties {
  return hasThai(text) ? {} : { letterSpacing: 6, textTransform: "uppercase" };
}

function titleSize(title: string, format: CardFormat): number {
  const base = format === "story" ? 68 : 64;
  if (title.length > 48) return base - 24;
  if (title.length > 26) return base - 12;
  return base;
}

function Bar({ rating, fill, track }: { rating: Rating | undefined; fill: string; track: string }) {
  const pct = isScored(rating ?? null) ? (toScore(rating as number) / 10) * 100 : 0;
  return (
    <div style={{ display: "flex", height: 8, borderRadius: 4, background: track, width: "100%" }}>
      <div style={{ width: `${pct}%`, height: 8, borderRadius: 4, background: fill }} />
    </div>
  );
}

/** Drawn rather than typed: the card fonts have no ★ glyph (and next/og would fetch one). */
function Star({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        fill={color}
        d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
      />
    </svg>
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

export function ReviewCard({ album, view, tracks, format, palette, cover }: ReviewCardProps) {
  const story = format === "story";
  const pad = story ? 96 : 80;
  const coverSize = story ? 400 : 300;
  const who = view.name;
  const thaiTitle = hasThai(album.title);
  const refName = view.reference?.name ?? "Original";
  const rowHeight = story ? 46 : 56;

  const header = (
    <div style={{ display: "flex", gap: 48, alignItems: "flex-end" }}>
      <CoverArt src={cover} size={coverSize} radius={20} placeholder={palette.barTrack} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", fontSize: 26, color: palette.score }}>
          {who && <span style={kicker(who)}>{who}</span>}
          <span style={kicker("x")}>{who ? "’s verdict" : "Album review"}</span>
        </div>
        <div
          style={{
            display: "block",
            lineClamp: 3,
            fontFamily: CARD_FONT.display,
            fontSize: titleSize(album.title, format),
            lineHeight: thaiTitle ? 1.35 : 1.04,
            color: palette.fg,
          }}
        >
          {album.title}
        </div>
        <div style={{ display: "block", lineClamp: 1, fontSize: 34, color: palette.dim }}>
          {album.year ? `${album.artist} · ${album.year}` : album.artist}
        </div>
      </div>
    </div>
  );

  const score = (
    <div style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
      <div
        style={{
          fontFamily: CARD_FONT.display,
          fontWeight: 600,
          fontSize: story ? 260 : 210,
          lineHeight: 0.9,
          color: palette.score,
        }}
      >
        {formatScore(view.score)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            fontFamily: CARD_FONT.display,
            fontStyle: "italic",
            fontSize: 64,
            color: palette.fg,
          }}
        >
          {view.verdict ?? "Unrated"}
        </div>
        <div style={{ fontSize: 26, color: palette.mute }}>
          {view.reference
            ? `vs ${refName} · ${formatScore(view.comparison?.scoreB ?? null)}`
            : `${view.stats.scored} of ${view.stats.total} tracks rated`}
        </div>
      </div>
    </div>
  );

  const quote: ReactNode =
    story && view.text ? (
      <div
        style={{
          display: "block",
          lineClamp: 4,
          fontFamily: CARD_FONT.display,
          fontStyle: hasThai(view.text) ? "normal" : "italic",
          fontSize: 40,
          lineHeight: hasThai(view.text) ? 1.55 : 1.3,
          color: palette.fg,
        }}
      >
        {`“${view.text}”`}
      </div>
    ) : null;

  const list = (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 22,
          color: palette.mute,
        }}
      >
        <span style={kicker("x")}>
          {tracks.highlights ? (story ? "Highlights" : "Top tracks") : "Track by track"}
        </span>
        {view.reference && (
          // Same widths and order as the score columns below: reference first, reviewer last.
          <span style={{ display: "flex", gap: 16 }}>
            <span style={{ display: "flex", justifyContent: "flex-end", width: 70 }}>
              {refName}
            </span>
            <span
              style={{
                display: "flex",
                justifyContent: "flex-end",
                width: 90,
                color: palette.score,
              }}
            >
              {who ?? "Reviewer"}
            </span>
          </span>
        )}
      </div>
      {tracks.items.map((t) => (
        <div
          key={t.index}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            height: rowHeight,
            justifyContent: "center",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: 16, fontSize: story ? 28 : 32 }}
          >
            <span style={{ width: 44, color: palette.mute, fontSize: 24 }}>{t.position}</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              {t.index === view.favorite && <Star color={palette.score} size={story ? 24 : 28} />}
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  color: t.rating === "skip" ? palette.mute : palette.fg,
                }}
              >
                {t.title}
              </span>
            </div>
            {t.refRating !== undefined && (
              <span
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  width: 70,
                  color: palette.mute,
                  fontSize: 24,
                }}
              >
                {scoreText(t.refRating)}
              </span>
            )}
            <span
              style={{
                display: "flex",
                justifyContent: "flex-end",
                width: 90,
                color: palette.score,
              }}
            >
              {scoreText(t.rating)}
            </span>
          </div>
          {!story && <Bar rating={t.rating} fill={palette.barFill} track={palette.barTrack} />}
        </div>
      ))}
    </div>
  );

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
          backgroundImage: `radial-gradient(circle at 20% ${story ? 12 : 22}%, ${palette.glow}55 0%, ${palette.bg} 60%)`,
        }),
        color: palette.fg,
        fontFamily: CARD_FONT.body,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: story ? 64 : 40 }}>
        {header}
        {score}
        {quote}
        {list}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Brand palette={palette} size={story ? 44 : 38} />
        <span style={{ fontSize: 22, color: palette.mute }}>
          Data from {SOURCE_LABEL[album.source]}
        </span>
      </div>
    </div>
  );
}
