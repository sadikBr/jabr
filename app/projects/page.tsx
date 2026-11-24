import { Hammer, Rocket } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ConceptChips } from "@/components/content/concept-chip";
import { SubjectBadge } from "@/components/content/subject";
import { Container, PageHeader } from "@/components/layout/page-shell";
import { ProjectReadiness } from "@/components/progress/project-readiness";
import { getConcepts } from "@/lib/content/queries";
import { content } from "@/lib/content/source";
import { learnLink } from "@/lib/progress/catalog.server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("projects");
  return { title: t("title"), description: t("lead") };
}

export default async function ProjectsPage() {
  const t = await getTranslations();
  // Capstones first.
  const projects = [...content.projects].sort(
    (a, b) => Number(b.kind === "capstone") - Number(a.kind === "capstone"),
  );

  return (
    <Container>
      <PageHeader title={t("projects.title")} lead={t("projects.lead")} />
      <p className="mb-6 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
        {t("projects.note")}
      </p>
      <ul className="grid gap-5 lg:grid-cols-2">
        {projects.map((project) => {
          const Icon = project.kind === "capstone" ? Rocket : Hammer;
          return (
            <li
              key={project.id}
              id={project.id}
              className="flex scroll-mt-24 flex-col rounded-2xl border border-dashed bg-card p-6"
            >
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon aria-hidden="true" className="size-6" />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {t(`projects.kinds.${project.kind}`)}
                    <span className="rounded-full bg-muted px-2 py-0.5 tracking-normal normal-case">
                      {t("common.comingSoon")}
                    </span>
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">
                    {project.title}
                  </h2>
                </div>
              </div>
              <p className="mt-4 flex-1 leading-relaxed text-muted-foreground">
                {project.summary}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.subjects.map((subject) => (
                  <SubjectBadge
                    key={subject}
                    subject={subject}
                    label={t(`subjects.${subject}`)}
                  />
                ))}
              </div>
              <p className="mt-5 mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("projects.uses")}
              </p>
              <ConceptChips concepts={getConcepts(content, project.concepts)} />
              <div className="mt-5 border-t pt-4">
                <ProjectReadiness
                  concepts={getConcepts(content, project.concepts).map(
                    ({ id, title }) => ({ id, title, learn: learnLink(id) }),
                  )}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
