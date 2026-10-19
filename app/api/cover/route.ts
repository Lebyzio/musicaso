import { jsonError } from "@/lib/api-response";
import { isAllowedImageUrl } from "@/lib/music/hosts";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
// No SVG: it can carry script, and covers are never SVG anyway.
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

/**
 * Same-origin proxy for album covers (canvas colour sampling, downloads).
 * Only allowlisted hosts — every redirect hop is re-checked so this can't become an open proxy.
 */
export async function GET(request: Request) {
  let url = new URL(request.url).searchParams.get("url") ?? "";
  if (!isAllowedImageUrl(url)) return jsonError("bad_request", "Image host not allowed", 400);

  let upstream: Response | undefined;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      upstream = await fetch(url, {
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      const location = upstream.headers.get("location");
      if (upstream.status < 300 || upstream.status >= 400 || !location) break;
      url = new URL(location, url).href;
      if (!isAllowedImageUrl(url)) {
        return jsonError("bad_request", "Image redirected to a host that is not allowed", 400);
      }
      upstream = undefined;
    }
  } catch {
    return jsonError("upstream", "Could not fetch image", 502);
  }

  if (!upstream) return jsonError("upstream", "Too many redirects", 502);
  if (upstream.status === 404) return jsonError("not_found", "Image not found", 404);
  if (!upstream.ok) return jsonError("upstream", `Image host responded ${upstream.status}`, 502);

  const contentType =
    upstream.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  if (!IMAGE_TYPES.has(contentType)) return jsonError("upstream", "Not an image", 502);
  if (Number(upstream.headers.get("content-length") ?? 0) > MAX_BYTES) {
    return jsonError("upstream", "Image too large", 502);
  }

  const body = await upstream.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return jsonError("upstream", "Image too large", 502);

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(body.byteLength),
      // Cover URLs are content-addressed (hash in the path), so they never change.
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
