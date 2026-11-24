"use client";

import { BookCheck, Flag, Sprout } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ConceptChips } from "@/components/content/concept-chip";
import { Button } from "@/components/ui/button";
import { masteryStatuses } from "@/lib/mastery/mastery";
import { isEmptyProgress } from "@/lib/progress/schema";
import {
  conceptStatus,
  countByStatus,
  progressTotals,
} from "@/lib/progress/summary";
import { useProgress } from "@/lib/progress/use-progress";

import type { ProgressCatalog } from "./catalog";
import { ContinueCard } from "./continue-card";
import { DataControls } from "./data-controls";
import { CourseProgressBar } from "./lesson-status";
import { MasteryIcon } from "./mastery-icon";

const eventIcons = {
  mastered: null, // uses the mastery ring
  "lesson-completed": BookCheck,
  goal: Flag,
} as const;

/** Whole calendar days from one moment to another, in the learner's time zone. */
export function daysBetween(from: number, to: number): number {
  const startOfDay = (time: number) => new Date(time).setHours(0, 0, 0, 0);
  return Math.max(
    0,
    Math.round((startOfDay(to) - startOfDay(from)) / 86_400_000),
  );
}

/**
 * "Today", "Yesterday", "3 days ago". Only ever rendered for saved events,
 * which exist in the browser alone, so reading the clock here never runs
 * during prerendering.
 */
function DaysAgo({ at }: { at: number }) {
  const t = useTranslations("progress");
  // Read once, so the label does not shift while the page is open.
  const [now] = useState(() => Date.now());
  return t("daysAgo", { days: daysBetween(at, now) });
}

/** The learner's home: where to continue, how far they've come, what's recent. */
export function DashboardView({ catalog }: { catalog: ProgressCatalog }) {
  const t = useTranslations();
  const progress = useProgress();
  const empty = isEmptyProgress(progress);

  const conceptIds = catalog.concepts.map((concept) => concept.id);
  const counts = countByStatus(progress, conceptIds);
  const totals = progressTotals(progress);
  // Furthest along first.
  const worked = catalog.concepts
    .filter((concept) => progress.mastery[concept.id] !== undefined)
    .sort(
      (a, b) =>
        masteryStatuses.indexOf(conceptStatus(progress, b.id)) -
          masteryStatuses.indexOf(conceptStatus(progress, a.id)) ||
        progress.mastery[b.id]!.score - progress.mastery[a.id]!.score,
    );
  const recent = [...progress.events].reverse().slice(0, 8);

  const eventName = (kind: string, id: string) =>
    kind === "mastered"
      ? catalog.concepts.find((concept) => concept.id === id)?.title
      : kind === "lesson-completed"
        ? catalog.lessons.find((lesson) => lesson.key === id)?.title
        : catalog.interactives[id];

  if (empty) {
    const first = catalog.lessons[0];
    return (
      <div className="space-y-10">
        <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Sprout aria-hidden="true" className="size-7" />
          </span>
          <h2 className="mt-4 text-xl font-semibold">
            {t("progress.emptyTitle")}
          </h2>
          <p className="mt-2 max-w-md leading-relaxed text-muted-foreground">
            {t("progress.emptyBody")}
          </p>
          {first ? (
            <Button asChild size="lg" className="mt-6">
              <Link href={first.href}>{t("progress.emptyCta")}</Link>
            </Button>
          ) : null}
        </div>
        {/* Same key as below, so its messages survive the switch between
            the empty and the full view (after an import, say). */}
        <DataControls key="data" />
      </div>
    );
  }

  const stats = [
    { key: "mastered", value: counts.mastered, status: "mastered" },
    { key: "practicing", value: counts.practicing, status: "practicing" },
    { key: "learning", value: counts.learning, status: "learning" },
    { key: "solved", value: totals.questionsSolved, status: null },
    { key: "lessons", value: totals.lessonsCompleted, status: null },
  ] as const;

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-xl font-semibold">
          {t("progress.continueTitle")}
        </h2>
        <ContinueCard lessons={catalog.lessons} />
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(({ key, value, status }) => (
          <div
            key={key}
            data-mastery={status ?? undefined}
            data-testid={`stat-${key}`}
            className="rounded-2xl border bg-card p-4"
          >
            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
              {status ? <MasteryIcon status={status} /> : null}
              {t(`progress.stats.${key}`)}
            </dt>
            <dd className="mt-1 font-(family-name:--font-display) text-3xl font-semibold tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="mb-3 text-xl font-semibold">
          {t("progress.coursesTitle")}
        </h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {catalog.courses.map((course) => (
            <li key={course.id} data-subject={course.subject}>
              <Link
                href={`/courses/${course.id}`}
                className="lift block rounded-2xl border bg-card p-5 hover:border-tone"
              >
                <span className="block text-lg font-semibold">
                  {course.title}
                </span>
                <CourseProgressBar
                  lessonKeys={course.lessonKeys}
                  always
                  className="mt-3"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="mb-3 text-xl font-semibold">
            {t("progress.conceptsTitle")}
          </h2>
          {worked.length > 0 ? (
            <ConceptChips concepts={worked} />
          ) : (
            <p className="text-muted-foreground">
              {t("progress.conceptsEmpty")}
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">
            {t("progress.recentTitle")}
          </h2>
          {recent.length > 0 ? (
            <ol className="space-y-2.5">
              {recent.map((event, index) => {
                const Icon = eventIcons[event.kind];
                return (
                  <li key={index} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center">
                      {Icon ? (
                        <Icon
                          aria-hidden="true"
                          className="size-5 text-primary"
                        />
                      ) : (
                        <MasteryIcon status="mastered" className="size-5" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {t(`progress.events.${event.kind}`, {
                          name: eventName(event.kind, event.id) ?? event.id,
                        })}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        <DaysAgo at={event.at} />
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-muted-foreground">{t("progress.recentEmpty")}</p>
          )}
        </section>
      </div>

      <DataControls key="data" />
    </div>
  );
}
