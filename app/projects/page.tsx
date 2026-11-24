import { ArrowRight, Flag, Hammer, Rocket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ConceptChips } from "@/components/content/concept-chip";
import { SubjectBadge } from "@/components/content/subject";
import { Container, PageHeader } from "@/components/layout/page-shell";
import { ProjectProgressBar } from "@/components/progress/milestone-status";
import { ProjectReadiness } from "@/components/progress/project-readiness";
import { Button } from "@/components/ui/button";
import { projectHref, projectMilestones } from "@/lib/content/projects";
import { getConcepts } from "@/lib/content/queries";
import { content } from "@/lib/content/source";
import { learnLink } from "@/lib/progress/catalog.server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("projects");
  return { title: t("title"), description: t("lead") };
}

export default async function ProjectsPage() {
  const t = await getTranslations();
  // Projects you can start come first, capstones before mini projects.
  const projects = [...content.projects].sort(
    (a, b) =>
      Number(b.status === "ready") - Number(a.status === "ready") ||
      Number(b.kind === "capstone") - Number(a.kind === "capstone"),
  );
  const anyComingSoon = projects.some((project) => project.status !== "ready");

  return (
    <Container>
      <PageHeader title={t("projects.title")} lead={t("projects.lead")} />
      <ul className="grid gap-5 lg:grid-cols-2">
        {projects.map((project) => {
          const Icon = project.kind === "capstone" ? Rocket : Hammer;
          const ready = project.status === "ready";
          const milestones = projectMilestones(content, project);
          const concepts = getConcepts(content, project.concepts);
          return (
            <li
              key={project.id}
              id={project.id}
              className={cn(
                "flex scroll-mt-24 flex-col rounded-2xl border bg-card p-6",
                !ready && "border-dashed",
              )}
            >
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon aria-hidden="true" className="size-6" />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {t(`projects.kinds.${project.kind}`)}
                    {ready ? (
                      <span className="flex items-center gap-1 tracking-normal normal-case">
                        <Flag aria-hidden="true" className="size-3.5" />
                        {t("projects.milestoneCount", {
                          count: milestones.length,
                        })}
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 tracking-normal normal-case">
                        {t("common.comingSoon")}
                      </span>
                    )}
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

              {ready ? (
                <>
                  <ProjectProgressBar
                    milestoneKeys={milestones.map((m) => m.key)}
                    className="mt-5"
                  />
                  <Button asChild size="lg" className="mt-5 self-start">
                    <Link href={projectHref(project)}>
                      {t("projects.open")}
                      <ArrowRight
                        aria-hidden="true"
                        className="rtl:rotate-180"
                      />
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-5 mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("projects.uses")}
                  </p>
                  <ConceptChips concepts={concepts} />
                </>
              )}

              <div className="mt-5 border-t pt-4">
                <ProjectReadiness
                  concepts={concepts.map(({ id, title }) => ({
                    id,
                    title,
                    learn: learnLink(id),
                  }))}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {anyComingSoon ? (
        <p className="mt-6 text-sm text-muted-foreground">
          {t("projects.note")}
        </p>
      ) : null}
    </Container>
  );
}
