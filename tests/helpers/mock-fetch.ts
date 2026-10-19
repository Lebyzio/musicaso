import { vi } from "vitest";

type Route = {
  /** Substring or pattern matched against the full request URL. First match wins. */
  match: string | RegExp;
  body?: unknown;
  status?: number;
  headers?: Record<string, string>;
};

/** Stub global fetch with canned responses; unmatched URLs fail the test loudly. */
export function mockFetch(routes: Route[]) {
  const fn = vi.fn<typeof fetch>(async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const route = routes.find((r) =>
      typeof r.match === "string" ? url.includes(r.match) : r.match.test(url),
    );
    if (!route) throw new Error(`Unmocked fetch: ${url}`);
    const isJson = route.body !== undefined && !(route.body instanceof Uint8Array);
    return new Response(
      isJson ? JSON.stringify(route.body) : ((route.body as BodyInit | undefined) ?? null),
      {
        status: route.status ?? 200,
        headers: { "content-type": isJson ? "application/json" : "", ...route.headers },
      },
    );
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

export function fetchedUrls(fn: ReturnType<typeof mockFetch>): string[] {
  return fn.mock.calls.map(([input]) => String(input));
}
