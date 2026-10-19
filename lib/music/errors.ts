export type ProviderErrorCode = "not_found" | "rate_limited" | "upstream" | "invalid_response";

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;

  constructor(code: ProviderErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ProviderError";
    this.code = code;
  }
}

export const PROVIDER_ERROR_STATUS: Record<ProviderErrorCode, number> = {
  not_found: 404,
  rate_limited: 429,
  upstream: 502,
  invalid_response: 502,
};
