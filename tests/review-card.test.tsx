import { describe, expect, it } from "vitest";
import { ListCard } from "@/components/card/list-card";
import { ReviewCard } from "@/components/card/review-card";
import { CARD_FORMATS, cardPalette } from "@/lib/card/themes";
import { cardTracks } from "@/lib/card/tracks";
import { getDictionary, LOCALES } from "@/lib/i18n";
import type { Album } from "@/lib/music/types";
import { renderPng } from "@/lib/render-image";
import { reviewView } from "@/lib/share/review-view";

const album: Album = {
  source: "dz",
  id: "798155361",
  title: "คราม",
  artist: "Bodyslam",
  year: 2010,
  coverUrl: "",
  coverThumbUrl: "",
  tracks: ["คราม", "ความรัก", "Sticker", "แสงสุดท้าย"].map((title, i) => ({
    id: String(i),
    position: i + 1,
    disc: 1,
    title,
    durationSec: 200,
  })),
};

const view = reviewView(album, {
  v: 1,
  s: "dz",
  a: album.id,
  k: 4,
  r: "gk_e",
  n: "ผู้ฟังที่นี่",
  t: "ที่สุดของปี",
  ref: { n: "เพื่อน", r: "ffgg" },
});

function png(bytes: Uint8Array) {
  const v = new DataView(bytes.buffer, bytes.byteOffset);
  return {
    signature: bytes.subarray(1, 4).toString(),
    width: v.getUint32(16),
    height: v.getUint32(20),
  };
}

describe("ReviewCard", () => {
  it.each(LOCALES)(
    "renders in %s",
    async (locale) => {
      const format = "story";
      const bytes = await renderPng(
        <ReviewCard
          album={album}
          view={view}
          format={format}
          palette={cardPalette("sleeve", "#f2b34b")}
          cover={null}
          tracks={cardTracks(album.tracks, view.ratings, format, view.reference?.ratings)}
          t={getDictionary(locale)}
        />,
        CARD_FORMATS[format],
      );
      expect(png(bytes)).toEqual({ signature: "80,78,71", width: 1080, height: 1920 });
    },
    20_000,
  );
});

describe("ListCard", () => {
  const entries = Array.from({ length: 10 }, (_, i) => ({
    rank: i + 1,
    title: i % 2 ? "In Rainbows" : "คราม",
    artist: i % 2 ? "Radiohead" : "Bodyslam",
    year: 2007 + i,
    score: 9 - i * 0.3,
    cover: null,
  }));

  it.each([
    ["square", "en"],
    ["story", "th"],
  ] as const)(
    "renders a %s card in %s",
    async (format, locale) => {
      const bytes = await renderPng(
        <ListCard
          title="อัลบั้มแห่งปี 2026 ของฉัน"
          name="ผู้ฟังที่นี่"
          entries={entries}
          format={format}
          palette={cardPalette("paper", "#f2b34b")}
          t={getDictionary(locale)}
        />,
        CARD_FORMATS[format],
      );
      expect(png(bytes)).toMatchObject(CARD_FORMATS[format]);
    },
    20_000,
  );
});
