import { renderRichText } from "@/lib/content/rich-text";

/** Server component for short content strings with maths. See renderRichText. */
export function RichText({ text }: { text: string }) {
  return <span dangerouslySetInnerHTML={{ __html: renderRichText(text) }} />;
}
