import Link from "next/link";

import type { Concept } from "@/lib/content/types";
import { cn } from "@/lib/utils";

/** A concept as a small link, with a dot in its subject's colour. */
export function ConceptChip({
  concept,
  className,
}: {
  concept: Pick<Concept, "id" | "title" | "subject">;
  className?: string;
}) {
  return (
    <Link
      href={`/concepts/${concept.id}`}
      data-subject={concept.subject}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:border-tone",
        className,
      )}
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-tone" />
      {concept.title}
    </Link>
  );
}

export function ConceptChips({
  concepts,
  className,
}: {
  concepts: Pick<Concept, "id" | "title" | "subject">[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {concepts.map((concept) => (
        <li key={concept.id}>
          <ConceptChip concept={concept} />
        </li>
      ))}
    </ul>
  );
}
