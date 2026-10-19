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
    // 448 fits the 14rem header cover on ~1.75x phones without jumping to the 640 device size.
    imageSizes: [32, 48, 64, 96, 128, 256, 384, 448],
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
