"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import type { MasteryChange } from "@/lib/progress/reduce";

import { MasteryIcon } from "./mastery-icon";

/**
 * Says when an answer moved a concept to a new mastery status, e.g.
 * "Tangent line: learning → practicing". Shown right under the feedback so
 * progress is felt at the moment it happens.
 */
export function MasteryChanges({
  changes,
  concepts,
}: {
  changes: MasteryChange[];
  concepts: { id: string; title: string }[];
}) {
  const t = useTranslations("mastery");
  if (changes.length === 0) return null;
  const title = (id: string) =>
    concepts.find((concept) => concept.id === id)?.title ?? id;
  const order = ["new", "learning", "practicing", "mastered"];

  return (
    <ul className="space-y-1.5" data-testid="mastery-changes">
      {changes.map((change) => {
        const up = order.indexOf(change.to) > order.indexOf(change.from);
        return (
          <li
            key={change.conceptId}
            data-mastery={change.to}
            className="animate-rise-in flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-tone-soft px-3 py-2 text-sm"
          >
            <MasteryIcon status={change.to} />
            <span className="font-semibold">{title(change.conceptId)}</span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {t(`status.${change.from}`)}
              <ArrowRight
                aria-hidden="true"
                className="size-3.5 rtl:rotate-180"
              />
              <span className="font-semibold text-tone">
                {t(`status.${change.to}`)}
              </span>
            </span>
            {change.to === "mastered" ? (
              <span className="font-semibold text-tone">
                {t("justMastered")}
              </span>
            ) : !up ? (
              <span className="text-muted-foreground">{t("slipped")}</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
