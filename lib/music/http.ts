import type { z } from "zod";
import { ProviderError } from "./errors";

/** Data Cache lifetimes (seconds) for `fetch(..., { next: { revalidate } })`. */
export const REVALIDATE = {
  search: 3600,
  album: 86400,
} as const;

const TIMEOUT_MS = 8000;

/**
 * GET a JSON endpoint. Throws ProviderError on network/HTTP failure or a non-JSON body.
 * `revalidate: false` bypasses the Data Cache (for short-lived data such as signed preview URLs).
 */
export async function fetchJson(url: string, revalidate: number | false): Promise<unknown> {
  const host = new URL(url).host;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...(revalidate === false ? { cache: "no-store" } : { next: { revalidate } }),
    });
  } catch (cause) {
    throw new ProviderError("upstream", `Request to ${host} failed`, { cause });
  }

  if (res.status === 429 || res.status === 403) {
    throw new ProviderError("rate_limited", `Rate limited by ${host}`);
  }
  if (res.status === 404) throw new ProviderError("not_found", `Not found on ${host}`);
  if (!res.ok) throw new ProviderError("upstream", `${host} responded ${res.status}`);

  try {
    return await res.json();
  } catch (cause) {
    throw new ProviderError("invalid_response", `${host} did not return JSON`, { cause });
  }
}

/** Validate an upstream payload; a shape mismatch becomes `invalid_response`. */
export function parseResponse<S extends z.ZodType>(schema: S, body: unknown): z.infer<S> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ProviderError("invalid_response", "Unexpected response shape", {
      cause: parsed.error,
    });
  }
  return parsed.data;
}
