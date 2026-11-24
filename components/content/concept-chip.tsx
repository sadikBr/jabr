"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { MasteryIcon } from "@/components/progress/mastery-icon";
import type { Concept } from "@/lib/content/types";
import { conceptStatus } from "@/lib/progress/summary";
import { useProgress } from "@/lib/progress/use-progress";
import { cn } from "@/lib/utils";

type ChipConcept = Pick<Concept, "id" | "title" | "subject">;

/**
 * A concept as a small link. The ring shows the learner's mastery of it on
 * this device, and the status is also there as text for screen readers.
 */
export function ConceptChip({
  concept,
  className,
}: {
  concept: ChipConcept;
  className?: string;
}) {
  const t = useTranslations("mastery");
  const status = conceptStatus(useProgress(), concept.id);
  return (
    <Link
      href={`/concepts/${concept.id}`}
      data-mastery={status}
      title={t(`status.${status}`)}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-card py-1.5 ps-2 pe-3 text-sm font-medium transition-colors hover:border-tone",
        status === "mastered" && "border-tone/40 bg-tone-soft",
        className,
      )}
    >
      <MasteryIcon status={status} />
      {concept.title}
      <span className="sr-only">({t(`status.${status}`)})</span>
    </Link>
  );
}

export function ConceptChips({
  concepts,
  className,
}: {
  concepts: ChipConcept[];
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
