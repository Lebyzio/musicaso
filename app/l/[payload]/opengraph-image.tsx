import { CoverArt } from "@/components/card/cover-art";
import { ListKicker, ListTitle } from "@/components/card/list-card";
import { getAlbumAccent } from "@/lib/accent";
import { leadCover, listCardEntries, loadListView } from "@/lib/card/list-entries";
import { CARD_FONT } from "@/lib/fonts";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pngResponse, renderPng } from "@/lib/render-image";
import { formatScore } from "@/lib/score";
import { decodeList } from "@/lib/share/list-codec";

export const alt = "Top album list on musicaso";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori: every element with more than one child needs display:flex; no grid, no Tailwind.
const C = { bg: "#0c0b0a", paper: "#f4efe6", dim: "#c9c2b6", mute: "#9a9387" };
const COVER = 168;
const SHOWN = 5;

function Brand({ accent, size: fontSize }: { accent: string; size: number }) {
  return (
    <div style={{ display: "flex", fontFamily: CARD_FONT.display, fontStyle: "italic", fontSize }}>
      musicaso<span style={{ color: accent }}>.</span>
    </div>
  );
}

export default async function OpenGraphImage({ params }: { params: Promise<{ payload: string }> }) {
  const { payload } = await params;
  const decoded = decodeList(payload);

  if (!decoded.ok) {
    return pngResponse(
      await renderPng(
        <div
          style={{
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            padding: 80,
            background: C.bg,
            color: C.paper,
          }}
        >
          <Brand accent="#f2b34b" size={96} />
        </div>,
        size,
      ),
    );
  }

  const list = decoded.payload;
  // Link previews are drawn in the list author's language.
  const t = getDictionary(isLocale(list.l) ? list.l : "en");
  const view = await loadListView(list);
  const [{ accent }, entries] = await Promise.all([
    getAlbumAccent(leadCover(view)),
    listCardEntries(view.slice(0, SHOWN), COVER, t),
  ]);

  const png = await renderPng(
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 56,
        background: C.bg,
        backgroundImage: `radial-gradient(circle at 15% 20%, ${accent}55 0%, ${C.bg} 60%)`,
        color: C.paper,
        fontFamily: CARD_FONT.body,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 860 }}>
          <ListKicker count={list.i.length} name={list.n} t={t} color={accent} size={24} />
          <ListTitle title={list.t ?? t.list.fallbackTitle} size={60} color={C.paper} />
        </div>
        <Brand accent={accent} size={32} />
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {entries.map((e) => (
          <div
            key={e.rank}
            style={{ display: "flex", flexDirection: "column", gap: 10, width: COVER }}
          >
            <div style={{ display: "flex", position: "relative", width: COVER, height: COVER }}>
              <CoverArt src={e.cover} size={COVER} radius={12} placeholder="#1d1b19" />
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: C.bg,
                  color: accent,
                  fontFamily: CARD_FONT.display,
                  fontWeight: 600,
                  fontSize: 22,
                }}
              >
                {e.rank}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: CARD_FONT.display,
                fontWeight: 600,
                fontSize: 30,
                color: accent,
                lineHeight: 1,
              }}
            >
              {formatScore(e.score)}
            </div>
          </div>
        ))}
        {list.i.length > SHOWN && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: COVER,
              fontSize: 28,
              color: C.mute,
            }}
          >
            +{list.i.length - SHOWN}
          </div>
        )}
      </div>
    </div>,
    size,
  );
  return pngResponse(png);
}
