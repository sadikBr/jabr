import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { MdxContent } from "@/components/content/mdx-content";
import { Container } from "@/components/layout/page-shell";
import { PrerequisitePanel } from "@/components/progress/prerequisite-panel";
import { MilestoneLab } from "@/components/projects/milestone-lab";
import {
  getMilestone,
  milestoneHref,
  projectHref,
  projectMilestones,
} from "@/lib/content/projects";
import { getConcepts, getProject } from "@/lib/content/queries";
import { content } from "@/lib/content/source";
import { learnLink } from "@/lib/progress/catalog.server";
import { conceptTitles } from "@/lib/questions/concept-titles";
import { buildQuestionView } from "@/lib/questions/view";

type Props = PageProps<"/projects/[project]/[milestone]">;

// Every valid URL is prerendered from generateStaticParams, so the page reads
// its params directly rather than streaming behind a placeholder.
export const instant = false;

export function generateStaticParams() {
  return content.milestones.map((milestone) => ({
    project: milestone.project,
    milestone: milestone.id,
  }));
}

async function find(params: Props["params"]) {
  const { project: projectId, milestone: milestoneId } = await params;
  const project = getProject(content, projectId);
  const milestone = getMilestone(content, `${projectId}/${milestoneId}`);
  return project && milestone && project.status === "ready"
    ? { project, milestone }
    : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await find(params);
  return found
    ? {
        title: `${found.milestone.title} · ${found.project.title}`,
        description: found.milestone.summary,
      }
    : {};
}

export default async function MilestonePage({ params }: Props) {
  const found = await find(params);
  if (!found) notFound();
  const { project, milestone } = found;
  const check = content.questions.find((q) => q.id === milestone.check);
  if (!check) notFound();

  const t = await getTranslations();
  const milestones = projectMilestones(content, project);
  const index = milestones.findIndex((item) => item.key === milestone.key);
  const link = (item: (typeof milestones)[number] | undefined) =>
    item
      ? { key: item.key, title: item.title, href: milestoneHref(item) }
      : null;
  const previous = link(milestones[index - 1]);
  const next = link(milestones[index + 1]);
  const requires = getConcepts(content, milestone.requires);

  return (
    <Container className="max-w-4xl pb-8" data-subject="computing">
      <div className="pt-6 pb-8">
        <Link
          href={projectHref(project)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {project.title}
        </Link>
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-tone">
          {t("projects.milestoneOf", {
            current: index + 1,
            total: milestones.length,
          })}
          {milestone.estimatedMinutes ? (
            <span className="flex items-center gap-1 font-normal text-muted-foreground">
              <Clock aria-hidden="true" className="size-4" />
              {t("common.minutes", { count: milestone.estimatedMinutes })}
            </span>
          ) : null}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-balance sm:text-5xl">
          {milestone.title}
        </h1>
        <p className="mt-3 max-w-[70ch] text-lg leading-relaxed text-muted-foreground">
          {milestone.summary}
        </p>

        {/* How far through the project this is: one segment per milestone. */}
        <ol aria-hidden="true" className="mt-6 flex gap-1.5">
          {milestones.map((item, i) => (
            <li
              key={item.key}
              className={
                i < index
                  ? "h-1.5 flex-1 rounded-full bg-tone/40"
                  : i === index
                    ? "h-1.5 flex-1 rounded-full bg-tone"
                    : "h-1.5 flex-1 rounded-full bg-muted"
              }
            />
          ))}
        </ol>

        {requires.length > 0 ? (
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("lesson.youWillUse")}
            </p>
            <PrerequisitePanel
              concepts={requires.map(({ id, title, subject }) => ({
                id,
                title,
                subject,
                learn: learnLink(id),
              }))}
            />
          </div>
        ) : null}
      </div>

      <div className="prose border-t pt-8">
        <MdxContent code={milestone.body} />
      </div>

      <div className="mt-6">
        <MilestoneLab
          view={buildQuestionView(check, undefined, conceptTitles)}
          milestoneKey={milestone.key}
          projectId={project.id}
          projectHref={projectHref(project)}
          projectMilestoneKeys={milestones.map((item) => item.key)}
          previous={previous}
          next={next}
        />
      </div>

      <nav
        aria-label={t("projects.milestonesTitle")}
        className="mt-10 flex items-center justify-between gap-3 border-t pt-6 text-sm font-medium"
      >
        {previous ? (
          <Link
            href={previous.href}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
            {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={next.href}
            className="flex items-center gap-1.5 text-end text-muted-foreground hover:text-foreground"
          >
            {next.title}
            <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </Link>
        ) : null}
      </nav>
    </Container>
  );
}
