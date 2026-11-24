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

const nextConfig: NextConfig = {
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
