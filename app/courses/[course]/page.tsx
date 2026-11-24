import { ArrowLeft, ArrowRight, Clock, Hammer, Rocket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Cover } from "@/components/content/cover";
import { SubjectBadge } from "@/components/content/subject";
import { Container } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import {
  courseLessons,
  getConcepts,
  getCourse,
  getProject,
  lessonHref,
} from "@/lib/content/queries";
import { content } from "@/lib/content/source";
import { cn } from "@/lib/utils";

type Props = PageProps<"/courses/[course]">;

// Every valid URL is prerendered from generateStaticParams, so the page reads
// its params directly rather than streaming behind a placeholder.
export const instant = false;

export function generateStaticParams() {
  return content.courses.map((course) => ({ course: course.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = getCourse(content, (await params).course);
  return course ? { title: course.title, description: course.summary } : {};
}

export default async function CoursePage({ params }: Props) {
  const course = getCourse(content, (await params).course);
  if (!course) notFound();
  const t = await getTranslations();
  const lessons = courseLessons(content, course);
  const firstReady = lessons.find((entry) => entry.lesson.status === "ready");
  const capstone = course.capstone
    ? getProject(content, course.capstone)
    : undefined;

  return (
    <div data-subject={course.subject}>
      <Cover
        seed={course.id}
        subject={course.subject}
        className="h-28 sm:h-40"
      />
      <Container className="pb-8">
        <Link
          href="/courses"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {t("courses.back")}
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SubjectBadge
            subject={course.subject}
            label={t(`subjects.${course.subject}`)}
          />
          <span className="text-sm font-medium text-muted-foreground">
            {t(`levels.${course.level}`)}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
          {course.title}
        </h1>
        <p className="mt-4 max-w-[70ch] text-lg leading-relaxed text-muted-foreground">
          {course.summary}
        </p>
        {firstReady ? (
          <Button asChild size="lg" className="mt-6 max-sm:w-full">
            <Link href={lessonHref(firstReady.lesson)}>
              <span className="truncate">
                {t("courses.startLesson", { title: firstReady.lesson.title })}
              </span>
              <ArrowRight aria-hidden="true" className="rtl:rotate-180" />
            </Link>
          </Button>
        ) : null}

        <h2 className="mt-14 text-2xl font-semibold tracking-tight">
          {t("courses.modules")}
        </h2>
        <ol className="mt-6 space-y-10">
          {course.modules.map((courseModule, moduleIndex) => {
            const project = courseModule.project
              ? getProject(content, courseModule.project)
              : undefined;
            return (
              <li key={courseModule.id}>
                <p className="text-sm font-semibold text-tone">
                  {t("courses.module", { number: moduleIndex + 1 })}
                </p>
                <h3 className="mt-1 text-xl font-semibold">
                  {courseModule.title}
                </h3>
                <p className="mt-1 max-w-[70ch] text-muted-foreground">
                  {courseModule.summary}
                </p>

                {/* The lessons sit on a vertical path, one stop each. */}
                <ol className="ms-4 mt-5 space-y-3 border-s-2 border-tone-soft">
                  {lessons
                    .filter((entry) => entry.module.id === courseModule.id)
                    .map(({ lesson, index }) => {
                      const ready = lesson.status === "ready";
                      return (
                        <li key={lesson.key} className="relative ps-8">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "absolute start-0 top-5 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border-4 border-background text-xs font-bold rtl:translate-x-1/2",
                              ready
                                ? "bg-tone text-background"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {index + 1}
                          </span>
                          <Link
                            href={lessonHref(lesson)}
                            className={cn(
                              "group block rounded-xl border bg-card p-4 transition-colors hover:border-tone",
                              !ready && "border-dashed",
                            )}
                          >
                            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="font-semibold">
                                {lesson.title}
                              </span>
                              {ready && lesson.estimatedMinutes ? (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock
                                    aria-hidden="true"
                                    className="size-3.5"
                                  />
                                  {t("common.minutes", {
                                    count: lesson.estimatedMinutes,
                                  })}
                                </span>
                              ) : null}
                              {!ready ? (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                  {t("common.comingSoon")}
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                              {lesson.summary}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  {project ? (
                    <li className="relative ps-8">
                      <span
                        aria-hidden="true"
                        className="absolute start-0 top-4 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border-4 border-background bg-accent text-accent-foreground rtl:translate-x-1/2"
                      >
                        <Hammer className="size-3.5" />
                      </span>
                      <Link
                        href="/projects"
                        className="block rounded-xl border border-accent/50 bg-accent/10 p-4 transition-colors hover:border-accent"
                      >
                        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          {t("courses.miniProject")}
                        </span>
                        <span className="mt-0.5 block font-semibold">
                          {project.title}
                        </span>
                      </Link>
                    </li>
                  ) : null}
                </ol>
              </li>
            );
          })}
        </ol>

        {capstone ? (
          <Link
            href="/projects"
            className="group mt-12 flex items-start gap-4 rounded-2xl border bg-card p-6 transition-colors hover:border-accent"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Rocket aria-hidden="true" className="size-6" />
            </span>
            <span>
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("courses.capstone")}
              </span>
              <span className="mt-1 block text-xl font-semibold">
                {capstone.title}
              </span>
              <span className="mt-1 block leading-relaxed text-muted-foreground">
                {capstone.summary}
              </span>
              <span className="mt-4 block">
                <ConceptChipsStatic
                  titles={getConcepts(content, capstone.concepts).map(
                    (concept) => concept.title,
                  )}
                />
              </span>
            </span>
          </Link>
        ) : null}
      </Container>
    </div>
  );
}

/** Concept names as plain labels, for use inside a link (no nested links). */
function ConceptChipsStatic({ titles }: { titles: string[] }) {
  return (
    <span className="flex flex-wrap gap-2">
      {titles.map((title) => (
        <span
          key={title}
          className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
        >
          {title}
        </span>
      ))}
    </span>
  );
}
