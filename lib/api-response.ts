import { PROVIDER_ERROR_STATUS, ProviderError } from "./music/errors";

export type ApiErrorCode =
  "bad_request" | "not_found" | "rate_limited" | "upstream" | "invalid_response" | "internal";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

const NO_STORE = { "Cache-Control": "no-store" };

export function jsonError(code: ApiErrorCode, message: string, status: number): Response {
  return Response.json({ error: { code, message } } satisfies ApiErrorBody, {
    status,
    headers: NO_STORE,
  });
}

/** Map anything thrown by a provider to a JSON error response. Errors are never cached. */
export function providerErrorResponse(err: unknown): Response {
  if (err instanceof ProviderError) {
    return jsonError(err.code, err.message, PROVIDER_ERROR_STATUS[err.code]);
  }
  console.error(err);
  return jsonError("internal", "Something went wrong", 500);
}
