# musicaso

Album reviews without a database — rate an album track by track and share it as a link, an image card, or (later) a short video.

```bash
pnpm install
pnpm dev
```

Before calling anything done: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

See [`AGENTS.md`](./AGENTS.md) for architecture, conventions and roadmap.

## Deploy (Vercel)

1. On [vercel.com](https://vercel.com/new), **Add New → Project** and import this GitHub repository.
2. Keep the detected settings: framework **Next.js**, install `pnpm install`, build `pnpm build`.
   No database, storage or API keys are needed (Deezer and iTunes are public).
3. Environment variables — optional:
   | Name                   | When to set it                                                                                                                             |
   | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
   | `NEXT_PUBLIC_SITE_URL` | A custom domain (e.g. `https://musicaso.app`). Without it, OG image URLs use Vercel's production domain (`VERCEL_PROJECT_PRODUCTION_URL`). |
4. Deploy. Every push to `main` deploys to production; other branches get preview URLs.

After the first deploy, check:

- `/` search returns albums (Deezer, falling back to Apple Music)
- an album page loads and its draft survives a reload
- a shared `/r/…` link opens, and `/r/…/opengraph-image` and `/r/…/card?format=story` render — including a Thai album (tone marks such as ที่ / น้ำ must be intact)
- the function logs show no errors about fonts or `index_bg.wasm` (both are traced in via `outputFileTracingIncludes` in `next.config.ts`)
