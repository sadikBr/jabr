import { ArrowLeft, Clock, Flag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ConceptChips } from "@/components/content/concept-chip";
import { Cover } from "@/components/content/cover";
import { SubjectBadge } from "@/components/content/subject";
import { Container } from "@/components/layout/page-shell";
import {
  MilestoneNode,
  MilestoneStateBadge,
  ProjectContinue,
  ProjectProgressBar,
} from "@/components/progress/milestone-status";
import { ProjectReadiness } from "@/components/progress/project-readiness";
import {
  milestoneHref,
  projectMilestones,
  projectMinutes,
} from "@/lib/content/projects";
import { getConcepts, getProject } from "@/lib/content/queries";
import { content } from "@/lib/content/source";
import { learnLink } from "@/lib/progress/catalog.server";

type Props = PageProps<"/projects/[project]">;

// Every valid URL is prerendered from generateStaticParams, so the page reads
// its params directly rather than streaming behind a placeholder.
export const instant = false;

export function generateStaticParams() {
  return content.projects
    .filter((project) => project.status === "ready")
    .map((project) => ({ project: project.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = getProject(content, (await params).project);
  return project ? { title: project.title, description: project.summary } : {};
}

export default async function ProjectPage({ params }: Props) {
  const project = getProject(content, (await params).project);
  if (!project || project.status !== "ready") notFound();
  const t = await getTranslations();
  const milestones = projectMilestones(content, project);
  const concepts = getConcepts(content, project.concepts);
  const minutes = projectMinutes(milestones);
  const [subject] = project.subjects;

  return (
    <div data-subject={subject}>
      <Cover seed={project.id} subject={subject!} className="h-24 sm:h-36" />
      <Container className="pb-8">
        <Link
          href="/projects"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {t("projects.back")}
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
            {t(`projects.kinds.${project.kind}`)}
          </span>
          {project.subjects.map((item) => (
            <SubjectBadge
              key={item}
              subject={item}
              label={t(`subjects.${item}`)}
            />
          ))}
        </div>
        <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">
          {project.title}
        </h1>
        <p className="mt-4 max-w-[70ch] text-lg leading-relaxed text-muted-foreground">
          {project.summary}
        </p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Flag aria-hidden="true" className="size-4" />
            {t("projects.milestoneCount", { count: milestones.length })}
          </span>
          {minutes > 0 ? (
            <span className="flex items-center gap-1.5">
              <Clock aria-hidden="true" className="size-4" />
              {t("projects.aboutHours", {
                hours: Math.round(minutes / 30) / 2,
              })}
            </span>
          ) : null}
        </p>

        <ProjectContinue
          milestones={milestones.map((milestone) => ({
            key: milestone.key,
            title: milestone.title,
            href: milestoneHref(milestone),
          }))}
          className="mt-6 max-w-xl"
        />
        <ProjectProgressBar
          milestoneKeys={milestones.map((milestone) => milestone.key)}
          className="mt-5 max-w-md"
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <section>
            <h2 className="text-2xl font-semibold">
              {t("projects.milestonesTitle")}
            </h2>
            {/* The milestones sit on a vertical path, one stop each. */}
            <ol className="ms-4 mt-5 space-y-3 border-s-2 border-tone-soft">
              {milestones.map((milestone, index) => (
                <li key={milestone.key} className="relative ps-8">
                  <MilestoneNode
                    milestoneKey={milestone.key}
                    number={index + 1}
                  />
                  <Link
                    href={milestoneHref(milestone)}
                    className="group block rounded-xl border bg-card p-4 transition-colors hover:border-tone"
                  >
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-semibold">{milestone.title}</span>
                      {milestone.estimatedMinutes ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock aria-hidden="true" className="size-3.5" />
                          {t("common.minutes", {
                            count: milestone.estimatedMinutes,
                          })}
                        </span>
                      ) : null}
                      <MilestoneStateBadge milestoneKey={milestone.key} />
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                      {milestone.summary}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("projects.readinessTitle")}
              </h2>
              <ProjectReadiness
                concepts={concepts.map(({ id, title }) => ({
                  id,
                  title,
                  learn: learnLink(id),
                }))}
              />
            </section>
            <section>
              <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("projects.uses")}
              </h2>
              <ConceptChips concepts={concepts} />
            </section>
          </aside>
        </div>
      </Container>
    </div>
  );
}
