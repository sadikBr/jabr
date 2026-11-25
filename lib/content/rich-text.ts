import katex from "katex";

/**
 * Renders a short content string to HTML: paragraphs, inline maths ($…$),
 * display maths ($$…$$), **bold**, `code` and fenced code blocks (three
 * backticks on a line of their own, before and after). Used for text that
 * lives in YAML rather than MDX (question prompts, hints, solutions).
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

const FENCE = /^```[^\n]*\n([\s\S]*?)\n```[ \t]*$/gm;

export function renderRichText(text: string): string {
  // Code blocks are lifted out first: their blank lines and symbols are
  // theirs, not paragraph breaks or maths.
  const code: string[] = [];
  const prose = text.trim().replace(FENCE, (_match, body: string) => {
    code.push(`<pre><code>${escapeHtml(body)}</code></pre>`);
    return `\n\n\u0000${code.length - 1}\u0000\n\n`;
  });

  const blocks = prose.split(/\n{2,}/).filter((block) => block.trim() !== "");
  const html = blocks.map((block) => {
    const lifted = /^\u0000(\d+)\u0000$/.exec(block.trim());
    if (lifted) return code[Number(lifted[1])]!;
    const display = /^\$\$([\s\S]+)\$\$$/.exec(block.trim());
    if (display) return renderMaths(display[1]!, true);
    return blocks.length === 1
      ? renderInline(block)
      : `<p>${renderInline(block)}</p>`;
  });
  return html.join("");
}
