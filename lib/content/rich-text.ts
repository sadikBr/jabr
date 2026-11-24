import katex from "katex";

/**
 * Renders a short content string to HTML: paragraphs, inline maths ($…$),
 * display maths ($$…$$), **bold** and `code`. Used for text that lives in
 * YAML rather than MDX (question prompts, hints, solutions).
 *
 * Runs on the server only, so KaTeX never ships to the browser. The input is
 * our own content; text is still escaped so stray < or & cannot break markup.
 */

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderMaths(tex: string, displayMode: boolean): string {
  return katex.renderToString(tex.trim(), { displayMode, throwOnError: false });
}

function renderInline(text: string): string {
  // Split out maths and code first, so their contents are left alone.
  return text
    .split(/(\$[^$\n]+\$|`[^`\n]+`)/)
    .map((part) => {
      if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
        return renderMaths(part.slice(1, -1), false);
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      }
      return escapeHtml(part).replace(
        /\*\*([^*]+)\*\*/g,
        "<strong>$1</strong>",
      );
    })
    .join("");
}

export function renderRichText(text: string): string {
  const blocks = text.trim().split(/\n{2,}/);
  const html = blocks.map((block) => {
    const display = /^\$\$([\s\S]+)\$\$$/.exec(block.trim());
    if (display) return renderMaths(display[1]!, true);
    return blocks.length === 1
      ? renderInline(block)
      : `<p>${renderInline(block)}</p>`;
  });
  return html.join("");
}
