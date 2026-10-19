import type { NextConfig } from "next";
import { IMAGE_HOSTS } from "./lib/music/hosts";

const nextConfig: NextConfig = {
  images: {
    // Same allowlist as /api/cover. `*.x` → `**.x` (any subdomain depth); no ports, no query strings.
    remotePatterns: IMAGE_HOSTS.map((host) => ({
      protocol: "https" as const,
      hostname: host.startsWith("*.") ? `*${host}` : host,
      port: "",
      search: "",
    })),
    qualities: [75],
  },
  // Read from disk at request time by lib/fonts.ts and lib/render-image.ts.
  outputFileTracingIncludes: {
    "/*": ["./assets/fonts/*.woff", "./node_modules/@resvg/resvg-wasm/index_bg.wasm"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
