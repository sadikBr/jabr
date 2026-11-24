"use client";

import { List, Map as MapIcon, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { ConceptChips } from "@/components/content/concept-chip";
import { subjectIcons } from "@/components/content/subject";
import type { ProgressCatalog } from "@/components/progress/catalog";
import { MasteryIcon } from "@/components/progress/mastery-icon";
import type { GraphLayout } from "@/lib/content/graph-layout";
import { type Subject, subjects } from "@/lib/content/vocabulary";
import { MASTERED_FROM } from "@/lib/mastery/constants";
import { masteryStatuses } from "@/lib/mastery/mastery";
import { countByStatus } from "@/lib/progress/summary";
import { useProgress } from "@/lib/progress/use-progress";
import { frontier } from "@/lib/recommend/recommend";
import { cn } from "@/lib/utils";

const ConceptMap = dynamic(() => import("./concept-map"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-muted/60" />,
});

type Filter =
  | { kind: "all" }
  | { kind: "subject"; subject: Subject }
  | { kind: "course"; id: string };

/**
 * The knowledge map with its filters and legend, and the same concepts as a
 * plain list for anyone who prefers that to a canvas.
 */
export function MapView({
  layout,
  catalog,
}: {
  layout: GraphLayout;
  catalog: Pick<ProgressCatalog, "concepts" | "courses">;
}) {
  const t = useTranslations();
  const progress = useProgress();
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [view, setView] = useState<"map" | "list">("map");

  const highlighted = useMemo(() => {
    if (filter.kind === "all") return null;
    if (filter.kind === "subject") {
      return new Set(
        catalog.concepts
          .filter((concept) => concept.subject === filter.subject)
          .map((concept) => concept.id),
      );
    }
    return new Set(
      catalog.courses.find((course) => course.id === filter.id)?.conceptIds,
    );
  }, [filter, catalog]);

  const ready = useMemo(
    () =>
      new Set(
        frontier(catalog.concepts, {
          mastery: Object.fromEntries(
            Object.entries(progress.mastery).map(([id, m]) => [id, m.score]),
          ),
          completedLessons: new Set(),
        }),
      ),
    [catalog.concepts, progress.mastery],
  );

  // Where the map opens when it is too big to show whole at a readable size:
  // on one concept and its neighbours. That concept is the one the learner
  // is furthest into without having mastered, or else the first they could
  // start on.
  const start = useMemo(() => {
    const working = catalog.concepts
      .filter((concept) => {
        const score = progress.mastery[concept.id]?.score;
        return score !== undefined && score < MASTERED_FROM;
      })
      .sort(
        (a, b) => progress.mastery[b.id]!.score - progress.mastery[a.id]!.score,
      )[0];
    const anchor =
      working ??
      catalog.concepts.find((concept) => ready.has(concept.id)) ??
      catalog.concepts[0];
    if (!anchor) return [];
    return [
      anchor.id,
      ...anchor.prerequisites,
      ...catalog.concepts
        .filter((concept) => concept.prerequisites.includes(anchor.id))
        .map((concept) => concept.id),
    ];
  }, [catalog.concepts, progress.mastery, ready]);

  const shown = catalog.concepts.filter(
    (concept) => highlighted === null || highlighted.has(concept.id),
  );
  const counts = countByStatus(
    progress,
    shown.map((concept) => concept.id),
  );
  const usedSubjects = subjects.filter((subject) =>
    catalog.concepts.some((concept) => concept.subject === subject),
  );

  const chip = (active: boolean) =>
    cn(
      "flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
      active
        ? "border-tone bg-tone text-background"
        : "bg-card text-muted-foreground hover:border-tone",
    );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          role="group"
          aria-label={t("map.filterLabel")}
          className="-mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          <button
            type="button"
            aria-pressed={filter.kind === "all"}
            onClick={() => setFilter({ kind: "all" })}
            className={chip(filter.kind === "all")}
          >
            {t("map.all")}
          </button>
          {usedSubjects.map((subject) => {
            const Icon = subjectIcons[subject];
            const active =
              filter.kind === "subject" && filter.subject === subject;
            return (
              <button
                key={subject}
                type="button"
                data-subject={subject}
                aria-pressed={active}
                onClick={() => setFilter({ kind: "subject", subject })}
                className={chip(active)}
              >
                <Icon aria-hidden="true" className="size-4" />
                {t(`subjects.${subject}`)}
              </button>
            );
          })}
          {catalog.courses.map((course) => {
            const active = filter.kind === "course" && filter.id === course.id;
            return (
              <button
                key={course.id}
                type="button"
                data-subject={course.subject}
                aria-pressed={active}
                onClick={() => setFilter({ kind: "course", id: course.id })}
                className={chip(active)}
              >
                {course.title}
              </button>
            );
          })}
        </div>

        <div
          role="group"
          aria-label={t("map.viewLabel")}
          className="flex shrink-0 self-start rounded-xl bg-muted p-1"
        >
          {(["map", "list"] as const).map((option) => {
            const Icon = option === "map" ? MapIcon : List;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => setView(option)}
                className={cn(
                  "flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-semibold",
                  view === option
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {t(`map.views.${option}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend, doubling as a count of where the learner stands. */}
      <ul
        className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm"
        data-testid="map-legend"
      >
        {masteryStatuses.map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <MasteryIcon status={status} />
            <span className="text-muted-foreground">
              {t(`mastery.status.${status}`)}
            </span>
            <span className="font-semibold tabular-nums">{counts[status]}</span>
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="flex size-4 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Sparkles aria-hidden="true" className="size-2.5" />
          </span>
          <span className="text-muted-foreground">{t("map.ready")}</span>
        </li>
      </ul>

      {view === "map" ? (
        <div
          data-testid="concept-map"
          className="relative left-1/2 mt-4 h-[76dvh] min-h-96 w-[calc(100vw-2rem)] max-w-[110rem] -translate-x-1/2 overflow-hidden rounded-2xl border bg-card"
        >
          <ConceptMap
            layout={layout}
            highlighted={highlighted}
            ready={ready}
            start={start}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {usedSubjects
            .map((subject) => ({
              subject,
              concepts: shown.filter((concept) => concept.subject === subject),
            }))
            .filter((group) => group.concepts.length > 0)
            .map(({ subject, concepts }) => (
              <section key={subject} data-subject={subject}>
                <h2 className="mb-3 text-lg font-semibold text-tone">
                  {t(`subjects.${subject}`)}
                </h2>
                <ConceptChips concepts={concepts} />
              </section>
            ))}
        </div>
      )}
      <p className="mt-3 text-sm text-muted-foreground">
        {view === "map" ? t("map.help") : t("map.listHelp")}
      </p>
    </div>
  );
}
