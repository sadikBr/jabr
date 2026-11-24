"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { subjectIcons } from "@/components/content/subject";
import type { ContentStatus, Subject } from "@/lib/content/vocabulary";
import { cn } from "@/lib/utils";

export interface ExplainerCard {
  id: string;
  title: string;
  summary: string;
  subject: Subject;
  status: ContentStatus;
  layers: number;
}

/** Question cards with a subject filter. Receives display fields only. */
export function ExplainerGrid({ explainers }: { explainers: ExplainerCard[] }) {
  const t = useTranslations();
  const [filter, setFilter] = useState<Subject | "all">("all");
  const subjects = [...new Set(explainers.map((e) => e.subject))];
  const shown = explainers.filter(
    (explainer) => filter === "all" || explainer.subject === filter,
  );

  return (
    <>
      <div
        role="group"
        aria-label={t("explore.filterLabel")}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {(["all", ...subjects] as const).map((subject) => {
          const active = filter === subject;
          const Icon = subject === "all" ? null : subjectIcons[subject];
          return (
            <button
              key={subject}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(subject)}
              data-subject={subject === "all" ? undefined : subject}
              className={cn(
                "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
                active
                  ? "border-tone bg-tone text-background"
                  : "bg-card text-muted-foreground hover:border-tone",
              )}
            >
              {Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
              {subject === "all" ? t("explore.all") : t(`subjects.${subject}`)}
            </button>
          );
        })}
      </div>

      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((explainer) => {
          const ready = explainer.status === "ready";
          const Icon = subjectIcons[explainer.subject];
          const body = (
            <>
              <span className="flex items-center justify-between gap-2">
                <span className="flex size-10 items-center justify-center rounded-xl bg-tone-soft text-tone">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {ready
                    ? t("explore.depthsLabel", { count: explainer.layers })
                    : t("common.comingSoon")}
                </span>
              </span>
              <span className="mt-4 block text-xl leading-snug font-semibold tracking-tight text-balance">
                {explainer.title}
              </span>
              <span className="mt-2 block flex-1 leading-relaxed text-muted-foreground">
                {explainer.summary}
              </span>
              {ready ? (
                <span className="mt-4 flex items-center gap-1 text-sm font-semibold text-tone">
                  {t(`subjects.${explainer.subject}`)}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                  />
                </span>
              ) : null}
            </>
          );
          return (
            <li key={explainer.id} data-subject={explainer.subject}>
              <Link
                href={`/explore/${explainer.id}`}
                className={cn(
                  "group flex h-full flex-col rounded-2xl border bg-card p-5 transition-colors hover:border-tone",
                  !ready && "border-dashed opacity-80",
                )}
              >
                {body}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
