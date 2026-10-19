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
  // Fonts for ImageResponse are read from disk at request time (lib/fonts.ts).
  outputFileTracingIncludes: {
    "/*": ["./assets/fonts/*.woff"],
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
