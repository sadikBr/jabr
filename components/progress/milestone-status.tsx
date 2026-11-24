"use client";

import { ArrowRight, Check, Hammer, PartyPopper } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { milestoneState, projectProgress } from "@/lib/progress/summary";
import { useProgress } from "@/lib/progress/use-progress";
import { cn } from "@/lib/utils";

/** The numbered stop for a milestone on a project's path: a tick once passed. */
export function MilestoneNode({
  milestoneKey,
  number,
}: {
  milestoneKey: string;
  number: number;
}) {
  const state = milestoneState(useProgress(), milestoneKey);
  return (
    <span
      aria-hidden="true"
      data-milestone-state={state}
      className={cn(
        "absolute start-0 top-5 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border-4 border-background text-xs font-bold rtl:translate-x-1/2",
        state === "passed" && "bg-success text-background",
        state === "in-progress" && "bg-tone-soft text-tone ring-2 ring-tone",
        state === "not-started" && "bg-tone text-background",
      )}
    >
      {state === "passed" ? (
        <Check className="size-4" strokeWidth={3} />
      ) : (
        number
      )}
    </span>
  );
}

/** "Passed" or "In progress" beside a milestone title; nothing if not started. */
export function MilestoneStateBadge({
  milestoneKey,
}: {
  milestoneKey: string;
}) {
  const t = useTranslations("projects");
  const state = milestoneState(useProgress(), milestoneKey);
  if (state === "not-started") return null;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-semibold",
        state === "passed"
          ? "bg-success-soft text-success"
          : "bg-tone-soft text-tone",
      )}
    >
      {t(state === "passed" ? "milestonePassed" : "milestoneStarted")}
    </span>
  );
}

/** A progress bar over a project's milestones. Hidden until one is opened, unless `always`. */
export function ProjectProgressBar({
  milestoneKeys,
  className,
  always = false,
}: {
  milestoneKeys: string[];
  className?: string;
  always?: boolean;
}) {
  const t = useTranslations("projects");
  const { passed, total, fraction, started } = projectProgress(
    useProgress(),
    milestoneKeys,
  );
  if (total === 0 || (!always && !started)) return null;
  const label = t("progress", { passed, total });
  return (
    <div className={className} data-testid="project-progress">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={passed}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-success transition-[width] duration-500"
          style={{ width: `${Math.max(fraction * 100, started ? 4 : 0)}%` }}
        />
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/** The milestone to work on next, or a well-done once the project is finished. */
export function ProjectContinue({
  milestones,
  className,
}: {
  milestones: { key: string; title: string; href: string }[];
  className?: string;
}) {
  const t = useTranslations("projects");
  const { nextKey, started, passed, total } = projectProgress(
    useProgress(),
    milestones.map((milestone) => milestone.key),
  );
  const next = milestones.find((milestone) => milestone.key === nextKey);

  if (!next) {
    return (
      <p
        data-testid="project-complete"
        className={cn(
          "flex items-center gap-3 rounded-2xl bg-success-soft p-4 font-semibold text-success sm:p-5",
          className,
        )}
      >
        <PartyPopper aria-hidden="true" className="size-6 shrink-0" />
        {t("complete")}
      </p>
    );
  }
  return (
    <Link
      href={next.href}
      data-testid="project-continue"
      className={cn(
        "lift group flex items-center gap-4 rounded-2xl border bg-card p-4 hover:border-accent sm:p-5",
        className,
      )}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Hammer aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {started ? t("continue") : t("start")} ·{" "}
          {t("milestoneOf", { current: passed + 1, total })}
        </span>
        <span className="block truncate text-lg font-semibold">
          {next.title}
        </span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 rtl:rotate-180"
      />
    </Link>
  );
}
