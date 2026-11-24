"use client";

import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { isEmptyProgress } from "@/lib/progress/schema";
import { useProgress } from "@/lib/progress/use-progress";
import { nextStep } from "@/lib/recommend/recommend";
import { cn } from "@/lib/utils";

import type { ProgressCatalog } from "./catalog";

type Lesson = ProgressCatalog["lessons"][number];

type Suggestion =
  | { kind: "resume"; lesson: Lesson; step: number }
  | { kind: "start" | "next"; lesson: Lesson }
  /** `lesson` teaches something that `forLesson` needs. */
  | { kind: "prerequisite"; lesson: Lesson; forLesson: Lesson };

/**
 * The lesson to carry on with. A lesson already in progress comes first;
 * otherwise it is the next step through the lessons given, which may be an
 * earlier lesson that fills a gap (see lib/recommend).
 * With `onlyReturning`, nothing is shown to a first-time visitor.
 */
export function ContinueCard({
  lessons,
  onlyReturning = false,
  className,
}: {
  lessons: Lesson[];
  onlyReturning?: boolean;
  className?: string;
}) {
  const t = useTranslations("progress");
  const progress = useProgress();
  if (onlyReturning && isEmptyProgress(progress)) return null;

  const find = (key: string) => lessons.find((lesson) => lesson.key === key);
  const suggestion = ((): Suggestion | null => {
    const inProgress = lessons
      .filter((lesson) => progress.lessons[lesson.key]?.status === "started")
      .sort(
        (a, b) =>
          progress.lessons[b.key]!.updatedAt -
          progress.lessons[a.key]!.updatedAt,
      )[0];
    // "Started" from the moment a lesson is opened; only offer to resume one
    // the learner actually got into.
    if (inProgress && progress.lessons[inProgress.key]!.lastStep > 0) {
      return {
        kind: "resume",
        lesson: inProgress,
        step: progress.lessons[inProgress.key]!.lastStep,
      };
    }

    const step = nextStep(
      lessons.map((lesson) => ({ ...lesson, ready: true })),
      {
        mastery: Object.fromEntries(
          Object.entries(progress.mastery).map(([id, m]) => [id, m.score]),
        ),
        completedLessons: new Set(
          lessons
            .filter(
              (lesson) => progress.lessons[lesson.key]?.status === "completed",
            )
            .map((lesson) => lesson.key),
        ),
      },
    );
    if (step.kind === "done") return null;
    const lesson = find(step.lessonKey);
    if (!lesson) return null;
    if (step.kind === "prerequisite") {
      const forLesson = find(step.forLesson);
      if (forLesson) return { kind: "prerequisite", lesson, forLesson };
    }
    const untouched = lessons.every((item) => !progress.lessons[item.key]);
    return { kind: untouched ? "start" : "next", lesson };
  })();

  if (!suggestion) {
    return onlyReturning ? null : (
      <p
        className={cn(
          "rounded-2xl border bg-card p-5 text-muted-foreground",
          className,
        )}
      >
        {t("allDone")}
      </p>
    );
  }

  const { lesson } = suggestion;
  const label =
    suggestion.kind === "resume"
      ? t("continueResume")
      : suggestion.kind === "start"
        ? t("continueStart")
        : suggestion.kind === "prerequisite"
          ? t("prerequisiteFor", { lesson: suggestion.forLesson.title })
          : t("continueNew");

  return (
    <Link
      href={lesson.href}
      data-subject={lesson.subject}
      data-testid="continue-card"
      className={cn(
        "lift group flex items-center gap-4 rounded-2xl border bg-card p-4 hover:border-tone sm:p-5",
        className,
      )}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-tone text-background">
        <Play aria-hidden="true" className="size-5 fill-current" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold tracking-wide text-tone uppercase">
          {label} · {lesson.courseTitle}
        </span>
        <span className="block truncate text-lg font-semibold">
          {lesson.title}
        </span>
        {suggestion.kind === "resume" ? (
          <span className="block text-sm text-muted-foreground">
            {t("continueStep", {
              current: Math.min(suggestion.step + 1, lesson.steps),
              total: lesson.steps,
            })}
          </span>
        ) : null}
      </span>
      <ArrowRight
        aria-hidden="true"
        className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 rtl:rotate-180"
      />
    </Link>
  );
}
