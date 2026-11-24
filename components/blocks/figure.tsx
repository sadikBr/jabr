import type { ReactNode } from "react";

export function Figure({
  caption,
  children,
}: {
  caption?: string;
  children: ReactNode;
}) {
  return (
    <figure className="rounded-xl border bg-card p-4">
      {children}
      {caption ? (
        <figcaption className="mt-3 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
