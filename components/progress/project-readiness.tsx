"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import type { Concept } from "@/lib/content/types";
import { useProgress } from "@/lib/progress/use-progress";
import { readiness } from "@/lib/recommend/recommend";

import type { LearnLink } from "./catalog";

/**
 * How ready the learner is for a project: the share of its concepts they are
 * practising, and where to learn the rest.
 */
export function ProjectReadiness({
  concepts,
}: {
  concepts: (Pick<Concept, "id" | "title"> & { learn: LearnLink })[];
}) {
  const t = useTranslations("projects");
  const progress = useProgress();
  const { fraction, toLearn } = readiness(
    {
      mastery: Object.fromEntries(
        Object.entries(progress.mastery).map(([id, m]) => [id, m.score]),
      ),
      completedLessons: new Set(),
    },
    concepts.map((concept) => concept.id),
  );
  const percent = Math.round(fraction * 100);
  const label = t("readiness", { percent });

  return (
    <div data-testid="project-readiness">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-success transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1.5 text-sm font-medium">{label}</p>
      {toLearn.length > 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("learnFirst")}:{" "}
          {concepts
            .filter((concept) => toLearn.includes(concept.id))
            .map((concept, index) => (
              <span key={concept.id}>
                {index > 0 ? ", " : null}
                <Link
                  href={concept.learn.href}
                  className="font-medium text-primary hover:underline"
                >
                  {concept.title}
                </Link>
              </span>
            ))}
        </p>
      ) : (
        <p className="mt-2 text-sm font-medium text-success">{t("readyAll")}</p>
      )}
    </div>
  );
}
