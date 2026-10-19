import { z } from "zod";
import { jsonError, providerErrorResponse } from "@/lib/api-response";
import { searchAlbums } from "@/lib/music";

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  source: z.enum(["dz", "it", "mb"]).optional(),
});

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = QuerySchema.safeParse({
    q: params.get("q") ?? "",
    source: params.get("source") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError(
      "bad_request",
      "Provide ?q= (1–100 chars) and optionally ?source=dz|it|mb",
      400,
    );
  }

  try {
    const result = await searchAlbums(parsed.data.q, parsed.data.source);
    return Response.json(result, {
      // Let the CDN absorb repeat searches — iTunes allows only ~20 requests a minute.
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    return providerErrorResponse(err);
  }
}
