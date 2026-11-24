"use client";

import { ArrowRight, Info, PartyPopper, Trophy } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { CodeLab } from "@/components/codelab/code-lab";
import { Button } from "@/components/ui/button";
import {
  recordMilestonePassed,
  recordMilestoneStarted,
} from "@/lib/progress/store";
import { milestoneState } from "@/lib/progress/summary";
import { useProgress } from "@/lib/progress/use-progress";
import type { QuestionView } from "@/lib/questions/view";

interface MilestoneLink {
  key: string;
  title: string;
  href: string;
}

/**
 * A milestone's code lab. Passing every check passes the milestone, which is
 * saved on this device, and opens the way to the next one.
 */
export function MilestoneLab({
  view,
  milestoneKey,
  projectId,
  projectHref,
  projectMilestoneKeys,
  previous,
  next,
}: {
  view: QuestionView;
  milestoneKey: string;
  projectId: string;
  projectHref: string;
  /** Every milestone of the project, in order. */
  projectMilestoneKeys: string[];
  previous: MilestoneLink | null;
  next: MilestoneLink | null;
}) {
  const t = useTranslations("projects");
  const progress = useProgress();
  const passed = milestoneState(progress, milestoneKey) === "passed";
  const previousPassed =
    previous === null || milestoneState(progress, previous.key) === "passed";

  // Opening a milestone starts it.
  useEffect(() => {
    recordMilestoneStarted(milestoneKey);
  }, [milestoneKey]);

  return (
    <div className="space-y-6">
      {/* Milestones build on each other, but nothing is locked away. */}
      {!previousPassed && previous ? (
        <p className="flex items-start gap-3 rounded-xl bg-accent/10 px-4 py-3 text-sm">
          <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <span>
            {t("buildsOn")}{" "}
            <Link
              href={previous.href}
              className="font-semibold text-primary hover:underline"
            >
              {previous.title}
            </Link>
          </span>
        </p>
      ) : null}

      <CodeLab
        view={view}
        onPassed={() =>
          recordMilestonePassed(milestoneKey, projectId, projectMilestoneKeys)
        }
      />

      {passed ? (
        <div
          data-testid="milestone-passed"
          className="animate-rise-in rounded-2xl border border-success bg-success-soft p-5 sm:p-6"
        >
          <p className="flex items-center gap-3 text-xl font-semibold text-success">
            {next ? (
              <PartyPopper aria-hidden="true" className="size-6 shrink-0" />
            ) : (
              <Trophy aria-hidden="true" className="size-6 shrink-0" />
            )}
            {next ? t("passedTitle") : t("completeTitle")}
          </p>
          <p className="mt-1 text-muted-foreground">
            {next ? t("passedBody") : t("completeBody")}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {next ? (
              <Button asChild size="lg">
                <Link href={next.href}>
                  {t("nextMilestone")}: {next.title}
                  <ArrowRight aria-hidden="true" className="rtl:rotate-180" />
                </Link>
              </Button>
            ) : null}
            <Button asChild size="lg" variant={next ? "outline" : "default"}>
              <Link href={projectHref}>{t("backToProject")}</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
