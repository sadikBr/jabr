import katex from "katex";
import { Fragment } from "react";

/**
 * Renders a short content string that may contain inline maths ($…$), display
 * maths ($$…$$) and paragraphs. Used for question prompts, hints and other
 * text that lives in YAML rather than MDX. Server-only: KaTeX stays off the client.
 */
export function RichText({ text }: { text: string }) {
  const paragraphs = text.trim().split(/\n{2,}/);
  return (
    <>
      {paragraphs.map((paragraph, i) => {
        const display = /^\$\$([\s\S]+)\$\$$/.exec(paragraph.trim());
        if (display) {
          return <Maths key={i} tex={display[1]!} display />;
        }
        return paragraphs.length === 1 ? (
          <Inline key={i} text={paragraph} />
        ) : (
          <p key={i}>
            <Inline text={paragraph} />
          </p>
        );
      })}
    </>
  );
}

function Inline({ text }: { text: string }) {
  // Odd-numbered parts are the contents of $…$.
  const parts = text.split(/\$([^$]+)\$/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Maths key={i} tex={part} />
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function Maths({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
  });
  const Tag = display ? "div" : "span";
  return (
    <Tag
      className={display ? "katex-display" : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
