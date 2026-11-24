import type { ComponentProps } from "react";

/**
 * Shows HTML that was rendered on the server from our own content
 * (see lib/content/rich-text.ts). Never pass anything a user typed.
 */
export function Html({
  html,
  ...props
}: { html: string } & Omit<ComponentProps<"div">, "children">) {
  return <div {...props} dangerouslySetInnerHTML={{ __html: html }} />;
}
