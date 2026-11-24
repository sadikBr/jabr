import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("KaTeX", () => {
  // The HTML is produced by rehype-katex's KaTeX and styled by the stylesheet
  // imported in app/layout.tsx. If the two versions differ, maths renders
  // with broken spacing (it happened: 0.16 HTML with 0.19 CSS).
  it("renders and styles maths with the same version", () => {
    const fromRehype = createRequire(require.resolve("rehype-katex"));
    expect(fromRehype.resolve("katex/package.json")).toBe(
      require.resolve("katex/package.json"),
    );
  });
});
