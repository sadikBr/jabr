import { readFileSync } from "node:fs";

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// In development, rebuild content whenever a file under /content changes.
// The first build happens before Next starts (`velite build &&` in the dev
// and build scripts), so .velite always exists by the time pages compile.
if (process.env.NODE_ENV === "development" && !process.env.VELITE_STARTED) {
  process.env.VELITE_STARTED = "1";
  void import("velite").then(({ build }) =>
    // Not strict here: a typo while editing should print an issue, not
    // stop the watcher. The scripts and CI build with --strict.
    build({ watch: true, clean: false, strict: false }),
  );
}

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const pyodideVersion = (
  JSON.parse(
    readFileSync(
      new URL("./node_modules/pyodide/package.json", import.meta.url),
      "utf8",
    ),
  ) as { version: string }
).version;

const nextConfig: NextConfig = {
  env: {
    // The code-lab worker downloads numpy, matplotlib… for exactly this version.
    NEXT_PUBLIC_PYODIDE_VERSION: pyodideVersion,
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        // Always check for a new service worker, and keep it locked down.
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; connect-src 'self' https://cdn.jsdelivr.net",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
