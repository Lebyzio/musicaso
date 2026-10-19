import { ImageResponse } from "next/og";
import { getAlbumAccent } from "@/lib/accent";
import { CARD_FONT, loadCardFonts } from "@/lib/fonts";
import { loadAlbum } from "@/lib/music";
import { formatScore } from "@/lib/score";
import { decodePayload } from "@/lib/share/codec";
import { reviewView } from "@/lib/share/review-view";
import { hasThai } from "@/lib/text";

export const alt = "Album review on musicaso";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori: every element with more than one child needs display:flex; no grid, no Tailwind.
const C = {
  bg: "#0c0b0a",
  paper: "#f4efe6",
  dim: "#c9c2b6",
  mute: "#9a9387",
  accent: "#f2b34b",
};

function titleSize(title: string): number {
  if (title.length > 48) return 46;
  if (title.length > 28) return 56;
  return 68;
}

function Fallback() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        background: C.bg,
        color: C.paper,
        fontFamily: CARD_FONT.display,
      }}
    >
      <div style={{ fontSize: 96, fontStyle: "italic", display: "flex" }}>
        musicaso<span style={{ color: C.accent }}>.</span>
      </div>
      <div style={{ fontSize: 40, color: C.dim, fontFamily: CARD_FONT.body }}>
        Rate every track. Share the verdict.
      </div>
    </div>
  );
}

export default async function OpenGraphImage({ params }: { params: Promise<{ payload: string }> }) {
  const [{ payload }, fonts] = await Promise.all([params, loadCardFonts()]);
  const options = { ...size, fonts };

  const decoded = decodePayload(payload);
  const result = decoded.ok ? await loadAlbum(decoded.payload.s, decoded.payload.a) : null;
  if (!decoded.ok || !result?.ok) return new ImageResponse(<Fallback />, options);

  const { album } = result;
  const view = reviewView(album, decoded.payload);
  const { accent } = await getAlbumAccent(album.coverUrl);
  const refScore = view.comparison?.scoreB ?? null;
  const thaiTitle = hasThai(album.title);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 56,
        padding: 64,
        background: C.bg,
        backgroundImage: `radial-gradient(circle at 18% 40%, ${accent}55 0%, ${C.bg} 55%)`,
        color: C.paper,
        fontFamily: CARD_FONT.body,
      }}
    >
      {album.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>
        <img
          src={album.coverUrl}
          width={470}
          height={470}
          alt=""
          style={{ borderRadius: 24, boxShadow: "0 30px 60px rgba(0,0,0,0.6)" }}
        />
      ) : (
        <div style={{ width: 470, height: 470, borderRadius: 24, background: "#1d1b19" }} />
      )}

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 8 }}>
        <div style={{ display: "flex", fontSize: 24, color: accent }}>
          {/* Letter-spacing pulls Thai tone marks off their base letters in Satori. */}
          {view.name && (
            <span
              style={hasThai(view.name) ? {} : { letterSpacing: 6, textTransform: "uppercase" }}
            >
              {view.name}
            </span>
          )}
          <span style={{ letterSpacing: 6, textTransform: "uppercase" }}>
            {view.name ? "’s verdict" : "Album review"}
          </span>
        </div>
        <div
          style={{
            fontFamily: CARD_FONT.display,
            fontSize: titleSize(album.title),
            lineHeight: thaiTitle ? 1.35 : 1.05,
            display: "block",
            lineClamp: 2,
          }}
        >
          {album.title}
        </div>
        <div style={{ fontSize: 32, color: C.dim }}>{album.artist}</div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 24 }}>
          <div
            style={{
              fontFamily: CARD_FONT.display,
              fontWeight: 600,
              fontSize: 168,
              lineHeight: 1,
              color: accent,
            }}
          >
            {formatScore(view.score)}
          </div>
          <div
            style={{
              fontFamily: CARD_FONT.display,
              fontStyle: "italic",
              fontSize: 48,
              color: C.dim,
            }}
          >
            {view.verdict ?? "Unrated"}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <div style={{ fontSize: 26, color: C.mute, display: "flex" }}>
            {view.reference
              ? `vs ${view.reference.name ?? "original"} · ${formatScore(refScore)}`
              : `${view.stats.scored} of ${view.stats.total} tracks rated`}
          </div>
          <div
            style={{
              fontSize: 30,
              fontFamily: CARD_FONT.display,
              fontStyle: "italic",
              display: "flex",
            }}
          >
            musicaso<span style={{ color: accent }}>.</span>
          </div>
        </div>
      </div>
    </div>,
    options,
  );
}
