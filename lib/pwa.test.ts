import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { appleStartupImages } from "./pwa";

describe("appleStartupImages", () => {
  it("points every launch image at a generated file", () => {
    expect(appleStartupImages.length).toBeGreaterThan(0);
    for (const { url } of appleStartupImages) {
      expect(existsSync(path.join(process.cwd(), "public", url)), url).toBe(
        true,
      );
    }
  });

  it("gives every image a unique media query", () => {
    const queries = appleStartupImages.map((image) => image.media);
    expect(new Set(queries).size).toBe(queries.length);
  });
});
