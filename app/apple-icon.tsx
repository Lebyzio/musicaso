import { pngResponse, renderPng } from "@/lib/render-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the record from app/icon.svg on an opaque square (iOS ignores transparency). */
export default async function AppleIcon() {
  const ring = (r: number) => (
    <div
      style={{
        position: "absolute",
        left: 90 - r,
        top: 90 - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        border: "4px solid #3a3632",
      }}
    />
  );
  const png = await renderPng(
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#0c0b0a",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 22,
          top: 22,
          width: 136,
          height: 136,
          borderRadius: 68,
          background: "#1d1b19",
        }}
      />
      {ring(54)}
      {ring(40)}
      <div
        style={{
          position: "absolute",
          left: 64,
          top: 64,
          width: 52,
          height: 52,
          borderRadius: 26,
          background: "#f2b34b",
        }}
      />
    </div>,
    size,
  );
  return pngResponse(png, { "Cache-Control": "public, max-age=31536000, immutable" });
}
