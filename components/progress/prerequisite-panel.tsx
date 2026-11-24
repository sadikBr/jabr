"use client";

import { ArrowRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { ConceptChips } from "@/components/content/concept-chip";
import type { Concept } from "@/lib/content/types";
import { useProgress } from "@/lib/progress/use-progress";
import { gaps } from "@/lib/recommend/recommend";

import type { LearnLink } from "./catalog";

/**
 * "You'll use": the concepts a lesson builds on, coloured by the learner's
 * mastery. If some are not yet being practised, each gets a one-click way to
 * brush up, a lesson that teaches it or failing that its own page.
 */
export function PrerequisitePanel({
  concepts,
}: {
  concepts: (Pick<Concept, "id" | "title" | "subject"> & {
    learn: LearnLink;
  })[];
}) {
  const t = useTranslations("prerequisites");
  const progress = useProgress();
  if (concepts.length === 0) return null;

  const missing = new Set(
    gaps(
      {
        mastery: Object.fromEntries(
          Object.entries(progress.mastery).map(([id, m]) => [id, m.score]),
        ),
        completedLessons: new Set(),
      },
      concepts.map((concept) => concept.id),
    ),
  );
  // Someone who has not answered anything yet has no mastery at all; telling
  // them everything is "new to you" would be noise. The hints start once
  // there is something to compare against.
  const showGaps = missing.size > 0 && Object.keys(progress.mastery).length > 0;

  return (
    <div data-testid="prerequisites">
      <ConceptChips concepts={concepts} />
      {showGaps ? (
        <div className="mt-3 rounded-xl bg-accent/10 p-3 text-sm">
          <p className="text-muted-foreground">
            {t("gaps", { count: missing.size })}
          </p>
          <ul className="mt-2 space-y-1.5">
            {concepts
              .filter((concept) => missing.has(concept.id))
              .map((concept) => (
                <li key={concept.id}>
                  <Link
                    href={concept.learn.href}
                    className="group inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                  >
                    {concept.title}:{" "}
                    {concept.learn.lessonTitle
                      ? t("refresh", { lesson: concept.learn.lessonTitle })
                      : t("read")}
                    <ArrowRight
                      aria-hidden="true"
                      className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                    />
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ) : missing.size === 0 ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-success">
          <CircleCheck aria-hidden="true" className="size-4" />
          {t("ready")}
        </p>
      ) : null}
    </div>
  );
}
