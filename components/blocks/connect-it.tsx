import { ArrowRight, Compass, Hammer } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ConceptChips } from "@/components/content/concept-chip";
import { projectHref } from "@/lib/content/projects";
import { getConcepts, getExplainer, getProject } from "@/lib/content/queries";
import { content } from "@/lib/content/source";

/** Links from a lesson or explainer to where its ideas are used. */
export async function ConnectIt({
  concepts = [],
  explainers = [],
  projects = [],
}: {
  concepts?: string[];
  explainers?: string[];
  projects?: string[];
}) {
  const t = await getTranslations();
  const destinations = [
    ...explainers.map((id) => {
      const explainer = getExplainer(content, id);
      return explainer
        ? {
            href: `/explore/${id}`,
            label: t("common.explainer"),
            icon: Compass,
            ...explainer,
          }
        : null;
    }),
    ...projects.map((id) => {
      const project = getProject(content, id);
      return project
        ? {
            href: projectHref(project),
            label: t("common.project"),
            icon: Hammer,
            ...project,
          }
        : null;
    }),
  ].filter((item) => item !== null);

  return (
    <div className="not-prose space-y-4 rounded-2xl border bg-card p-5">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t("blocks.connectTitle")}
      </p>
      <ConceptChips concepts={getConcepts(content, concepts)} />
      {destinations.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {destinations.map(
            ({ href, label, icon: Icon, id, title, status }) => (
              <li key={`${label}-${id}`}>
                <Link
                  href={href}
                  className="group flex h-full items-start gap-3 rounded-lg border p-4 transition-colors hover:border-primary/50"
                >
                  <Icon
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      {label}
                      {status === "coming-soon" ? (
                        <span className="rounded-full bg-muted px-2 py-0.5">
                          {t("common.soon")}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block leading-snug font-semibold">
                      {title}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                  />
                </Link>
              </li>
            ),
          )}
        </ul>
      ) : null}
    </div>
  );
}
