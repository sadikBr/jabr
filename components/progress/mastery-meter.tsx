"use client";

import { useTranslations } from "next-intl";

import { MASTERED_FROM, PRACTICING_FROM } from "@/lib/mastery/constants";
import { masteryStatus } from "@/lib/mastery/mastery";
import { useProgress } from "@/lib/progress/use-progress";

import { MasteryIcon } from "./mastery-icon";

/** The learner's mastery of one concept: status, a bar with the two thresholds, and what to do next. */
export function MasteryMeter({ conceptId }: { conceptId: string }) {
  const t = useTranslations("mastery");
  const score = useProgress().mastery[conceptId]?.score;
  const status = masteryStatus(score);
  const percent = Math.round((score ?? 0) * 100);

  return (
    <section
      data-mastery={status}
      data-testid="mastery-meter"
      className="rounded-2xl border bg-card p-5"
    >
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t("yours")}
      </h2>
      <p className="mt-2 flex items-center gap-2 text-xl font-semibold">
        <MasteryIcon status={status} className="size-6" />
        {t(`status.${status}`)}
      </p>
      <div
        role="progressbar"
        aria-label={t("yours")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={t(`status.${status}`)}
        className="relative mt-4 h-3 rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-tone transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
        {/* Where "practicing" and "mastered" begin. */}
        {[PRACTICING_FROM, MASTERED_FROM].map((threshold) => (
          <span
            key={threshold}
            aria-hidden="true"
            className="absolute inset-y-0 w-0.5 bg-background"
            style={{ insetInlineStart: `${threshold * 100}%` }}
          />
        ))}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {t(`hint.${status}`)}
      </p>
    </section>
  );
}
