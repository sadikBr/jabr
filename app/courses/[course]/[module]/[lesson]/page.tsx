import { ArrowLeft, ArrowRight, Clock, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LessonDeck } from "@/components/blocks/lesson-deck";
import { ConceptChips } from "@/components/content/concept-chip";
import { MdxContent } from "@/components/content/mdx-content";
import { Container } from "@/components/layout/page-shell";
import { PrerequisitePanel } from "@/components/progress/prerequisite-panel";
import { Button } from "@/components/ui/button";
import {
  getConcepts,
  getCourse,
  getLesson,
  lessonHref,
  lessonNeighbours,
} from "@/lib/content/queries";
import { content } from "@/lib/content/source";
import { learnLink } from "@/lib/progress/catalog.server";
import type { StepKind } from "@/lib/content/vocabulary";

type Props = PageProps<"/courses/[course]/[module]/[lesson]">;

// Every valid URL is prerendered from generateStaticParams, so the page reads
// its params directly rather than streaming behind a placeholder.
export const instant = false;

export function generateStaticParams() {
  return content.lessons.map((lesson) => ({
    course: lesson.course,
    module: lesson.module,
    lesson: lesson.id,
  }));
}

async function findLesson(params: Props["params"]) {
  const { course, module, lesson } = await params;
  return getLesson(content, `${course}/${module}/${lesson}`);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lesson = await findLesson(params);
  return lesson ? { title: lesson.title, description: lesson.summary } : {};
}

export default async function LessonPage({ params }: Props) {
  const lesson = await findLesson(params);
  const course = lesson ? getCourse(content, lesson.course) : undefined;
  if (!lesson || !course) notFound();

  const t = await getTranslations();
  const courseModule = course.modules.find((m) => m.id === lesson.module);
  const teaches = getConcepts(content, lesson.teaches);
  const requires = getConcepts(content, lesson.requires);
  const { next } = lessonNeighbours(content, lesson);
  const ready = lesson.status === "ready";

  return (
    <Container className="max-w-4xl">
      <div data-subject={course.subject} className="pt-6 pb-8">
        <Link
          href={`/courses/${course.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {course.title}
          {courseModule ? ` · ${courseModule.title}` : null}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          {lesson.title}
        </h1>
        <p className="mt-3 max-w-[70ch] text-lg leading-relaxed text-muted-foreground">
          {lesson.summary}
        </p>
        {ready && lesson.estimatedMinutes ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock aria-hidden="true" className="size-4" />
            {t("common.minutes", { count: lesson.estimatedMinutes })}
          </p>
        ) : null}

        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("lesson.youWillLearn")}
            </dt>
            <dd>
              <ConceptChips concepts={teaches} />
            </dd>
          </div>
          {requires.length > 0 ? (
            <div>
              <dt className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("lesson.youWillUse")}
              </dt>
              <dd>
                <PrerequisitePanel
                  concepts={requires.map(({ id, title, subject }) => ({
                    id,
                    title,
                    subject,
                    learn: learnLink(id, lesson.key),
                  }))}
                />
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {ready ? (
        <LessonDeck
          lessonKey={lesson.key}
          steps={lesson.refs.steps.map((step) => ({
            kind: step.kind as StepKind,
            title: step.title ?? "",
          }))}
          completion={
            <>
              {next ? (
                <Button asChild size="lg">
                  <Link href={lessonHref(next)}>
                    {t("lesson.nextLesson")}: {next.title}
                    <ArrowRight aria-hidden="true" className="rtl:rotate-180" />
                  </Link>
                </Button>
              ) : null}
              <Button asChild size="lg" variant={next ? "outline" : "default"}>
                <Link href={`/courses/${course.id}`}>
                  {t("lesson.backToCourse")}
                </Link>
              </Button>
            </>
          }
        >
          <MdxContent code={lesson.body} />
        </LessonDeck>
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <PenLine aria-hidden="true" className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">
            {t("lesson.comingSoonTitle")}
          </h2>
          <p className="mt-2 max-w-md leading-relaxed text-muted-foreground">
            {t("lesson.comingSoonBody")}
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href={`/courses/${course.id}`}>
              {t("lesson.backToCourse")}
            </Link>
          </Button>
        </div>
      )}
    </Container>
  );
}
