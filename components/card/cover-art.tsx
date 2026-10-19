/* eslint-disable @next/next/no-img-element -- rendered by Satori, not the browser */

/** Offset, alpha of the stacked layers that fake a soft drop shadow (largest first). Many thin
 * layers rather than a few strong ones, so the edges blend instead of reading as steps. */
const SHADOW_LAYERS: [number, number][] = [32, 28, 24, 20, 16, 12, 8, 4].map((offset) => [
  offset,
  0.03,
]);

/**
 * Album cover for image renders. A CSS box-shadow becomes a Gaussian blur in resvg and costs
 * ~2 s per card, so the shadow is faked with a few translucent rounded layers (~free).
 */
export function CoverArt({
  src,
  size,
  radius,
  placeholder,
}: {
  src: string | null;
  size: number;
  radius: number;
  placeholder: string;
}) {
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size }}>
      {SHADOW_LAYERS.map(([offset, alpha]) => (
        <div
          key={offset}
          style={{
            position: "absolute",
            left: -offset / 3,
            right: -offset / 3,
            top: offset / 2,
            bottom: -offset,
            borderRadius: radius + offset,
            background: `rgba(0,0,0,${alpha})`,
          }}
        />
      ))}
      {src ? (
        <img
          src={src}
          width={size}
          height={size}
          alt=""
          style={{ position: "relative", borderRadius: radius }}
        />
      ) : (
        <div
          style={{
            position: "relative",
            width: size,
            height: size,
            borderRadius: radius,
            background: placeholder,
          }}
        />
      )}
    </div>
  );
}
