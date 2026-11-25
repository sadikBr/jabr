import { describe, expect, it } from "vitest";

import { renderRichText } from "./rich-text";

describe("renderRichText", () => {
  it("renders inline maths with KaTeX", () => {
    const html = renderRichText("Slope of $x^2$ at 1?");
    expect(html).toContain('class="katex"');
    expect(html).toContain("Slope of ");
    expect(html).not.toContain("$");
  });

  it("keeps a single line free of paragraph tags", () => {
    expect(renderRichText("Just text")).toBe("Just text");
  });

  it("splits paragraphs and renders display maths as a block", () => {
    const html = renderRichText("First.\n\n$$\\frac{a}{b}$$\n\nLast.");
    expect(html).toContain("<p>First.</p>");
    expect(html).toContain("katex-display");
    expect(html).toContain("<p>Last.</p>");
  });

  it("supports bold and inline code", () => {
    expect(renderRichText("Use **care** with `dt = 0.1`")).toBe(
      "Use <strong>care</strong> with <code>dt = 0.1</code>",
    );
  });

  it("renders a fenced block as code, exactly as written", () => {
    const html = renderRichText(
      "What does this print?\n\n```\nx = 5\n\nif x < 7:\n    print($x$)\n```\n\nThink first.",
    );
    expect(html).toBe(
      "<p>What does this print?</p>" +
        "<pre><code>x = 5\n\nif x &lt; 7:\n    print($x$)</code></pre>" +
        "<p>Think first.</p>",
    );
  });

  it("renders a code block that is the whole text", () => {
    expect(renderRichText("```python\nprint(1)\n```")).toBe(
      "<pre><code>print(1)</code></pre>",
    );
  });

  it("escapes HTML in text and in code", () => {
    expect(renderRichText("if a < b & c > d")).toBe(
      "if a &lt; b &amp; c &gt; d",
    );
    expect(renderRichText("`<script>`")).toBe("<code>&lt;script&gt;</code>");
  });
});
