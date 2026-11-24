"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { courseProgress, lessonState } from "@/lib/progress/summary";
import { useProgress } from "@/lib/progress/use-progress";
import { cn } from "@/lib/utils";

/** The numbered stop for a lesson on a course's path: a tick once finished. */
export function LessonNode({
  lessonKey,
  number,
  ready,
}: {
  lessonKey: string;
  number: number;
  ready: boolean;
}) {
  const state = lessonState(useProgress(), lessonKey);
  return (
    <span
      aria-hidden="true"
      data-lesson-state={state}
      className={cn(
        "absolute start-0 top-5 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border-4 border-background text-xs font-bold rtl:translate-x-1/2",
        state === "completed" && "bg-success text-background",
        state === "started" && "bg-tone-soft text-tone ring-2 ring-tone",
        state === "not-started" &&
          (ready
            ? "bg-tone text-background"
            : "bg-muted text-muted-foreground"),
      )}
    >
      {state === "completed" ? (
        <Check className="size-4" strokeWidth={3} />
      ) : (
        number
      )}
    </span>
  );
}

/** "Finished" or "In progress" beside a lesson title; nothing if not started. */
export function LessonStateBadge({ lessonKey }: { lessonKey: string }) {
  const t = useTranslations("progress");
  const state = lessonState(useProgress(), lessonKey);
  if (state === "not-started") return null;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-semibold",
        state === "completed"
          ? "bg-success-soft text-success"
          : "bg-tone-soft text-tone",
      )}
    >
      {t(state === "completed" ? "lessonDone" : "lessonStarted")}
    </span>
  );
}

/** A progress bar over a course's written lessons. Hidden until one is started. */
export function CourseProgressBar({
  lessonKeys,
  className,
  always = false,
}: {
  lessonKeys: string[];
  className?: string;
  /** Show the bar even at zero. */
  always?: boolean;
}) {
  const t = useTranslations("progress");
  const { completed, started, total, fraction } = courseProgress(
    useProgress(),
    lessonKeys,
  );
  if (total === 0 || (!always && completed + started === 0)) return null;
  const label = t("courseProgress", { completed, total });
  return (
    <div className={className} data-testid="course-progress">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-success transition-[width] duration-500"
          style={{
            width: `${Math.max(fraction * 100, completed + started > 0 ? 4 : 0)}%`,
          }}
        />
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
