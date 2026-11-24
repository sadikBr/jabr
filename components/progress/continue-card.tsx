"use client";

import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { continueLesson } from "@/lib/progress/summary";
import { isEmptyProgress } from "@/lib/progress/schema";
import { useProgress } from "@/lib/progress/use-progress";
import { cn } from "@/lib/utils";

import type { ProgressCatalog } from "./catalog";

/**
 * The lesson to carry on with: the one in progress, or the next one not yet
 * started. With `onlyReturning`, nothing is shown to a first-time visitor.
 */
export function ContinueCard({
  lessons,
  onlyReturning = false,
  className,
}: {
  lessons: ProgressCatalog["lessons"];
  onlyReturning?: boolean;
  className?: string;
}) {
  const t = useTranslations("progress");
  const progress = useProgress();
  if (onlyReturning && isEmptyProgress(progress)) return null;

  const target = continueLesson(
    progress,
    lessons.map((lesson) => lesson.key),
  );
  const lesson = target && lessons.find((item) => item.key === target.key);
  if (!target || !lesson) {
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
  const resuming = progress.lessons[lesson.key]?.status === "started";
  const firstTime = lessons.every((item) => !progress.lessons[item.key]);

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
          {resuming
            ? t("continueResume")
            : firstTime
              ? t("continueStart")
              : t("continueNew")}{" "}
          · {lesson.courseTitle}
        </span>
        <span className="block truncate text-lg font-semibold">
          {lesson.title}
        </span>
        {resuming ? (
          <span className="block text-sm text-muted-foreground">
            {t("continueStep", {
              current: Math.min(target.step + 1, lesson.steps),
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
