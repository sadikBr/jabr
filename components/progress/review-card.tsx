"use client";

import { ArrowRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useProgress } from "@/lib/progress/use-progress";
import { dueConcepts, nextDue } from "@/lib/review/session";
import { cn } from "@/lib/utils";

import type { ProgressCatalog } from "./catalog";
import { daysBetween } from "./dashboard-view";

/** Reviews at a glance: how many concepts are due, or when the next one is. */
export function ReviewCard({
  questionsByConcept,
  className,
}: {
  questionsByConcept: ProgressCatalog["questionsByConcept"];
  className?: string;
}) {
  const t = useTranslations("review");
  const { reviews } = useProgress();
  // The server renders this with no reviews, so the clock is only read in
  // the browser.
  const [now] = useState(() =>
    typeof window === "undefined" ? 0 : Date.now(),
  );
  const due = dueConcepts(reviews, questionsByConcept, now).length;
  const upcoming = nextDue(reviews, now);
  const hasCards = Object.keys(reviews).length > 0;

  return (
    <Link
      href="/review"
      data-testid="review-card"
      className={cn(
        "lift group flex items-center gap-4 rounded-2xl border bg-card p-4 hover:border-primary/50 sm:p-5",
        due > 0 && "border-accent bg-accent/10",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl",
          due > 0
            ? "bg-accent text-accent-foreground"
            : "bg-secondary text-secondary-foreground",
        )}
      >
        <RotateCcw aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("cardTitle")}
        </span>
        <span className="block text-lg font-semibold">
          {due > 0
            ? t("cardDue", { count: due })
            : hasCards
              ? t("cardNone")
              : t("cardEmpty")}
        </span>
        {due === 0 && upcoming !== null ? (
          <span className="block text-sm text-muted-foreground">
            {t("noneNext", { days: daysBetween(now, upcoming) })}
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
