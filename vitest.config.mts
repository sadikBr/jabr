import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // The real package throws outside a React Server environment. Tests
      // exercise server modules directly, so it is replaced by an empty one.
      "server-only": path.resolve(import.meta.dirname, "tests/unit/empty.ts"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/unit/setup.ts"],
    include: ["{lib,components,app,scripts,tests/unit}/**/*.test.{ts,tsx}"],
  },
});
