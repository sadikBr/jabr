import { ArrowRight, BookOpen, Clock, Shapes } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Cover } from "@/components/content/cover";
import { SubjectBadge } from "@/components/content/subject";
import { Container, PageHeader } from "@/components/layout/page-shell";
import { CourseProgressBar } from "@/components/progress/lesson-status";
import { courseLessons, courseStats } from "@/lib/content/queries";
import { content } from "@/lib/content/source";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("courses");
  return { title: t("title"), description: t("lead") };
}

export default async function CoursesPage() {
  const t = await getTranslations();
  return (
    <Container>
      <PageHeader title={t("courses.title")} lead={t("courses.lead")} />
      <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {content.courses.map((course) => {
          const stats = courseStats(content, course);
          return (
            <li key={course.id}>
              <Link
                href={`/courses/${course.id}`}
                data-subject={course.subject}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-colors hover:border-tone"
              >
                <Cover
                  seed={course.id}
                  subject={course.subject}
                  className="h-32"
                />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <SubjectBadge
                      subject={course.subject}
                      label={t(`subjects.${course.subject}`)}
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      {t(`levels.${course.level}`)}
                    </span>
                  </div>
                  <h2 className="mt-3 flex items-center gap-1.5 text-xl font-semibold tracking-tight">
                    {course.title}
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                    />
                  </h2>
                  <p className="mt-2 flex-1 leading-relaxed text-muted-foreground">
                    {course.summary}
                  </p>
                  <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t pt-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <BookOpen aria-hidden="true" className="size-4" />
                      {t("courses.lessons", { count: stats.lessons })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Shapes aria-hidden="true" className="size-4" />
                      {t("courses.concepts", { count: stats.concepts })}
                    </span>
                    {stats.readyLessons < stats.lessons ? (
                      <span className="flex items-center gap-1.5">
                        <Clock aria-hidden="true" className="size-4" />
                        {t("courses.available", {
                          ready: stats.readyLessons,
                          total: stats.lessons,
                        })}
                      </span>
                    ) : null}
                  </p>
                  <CourseProgressBar
                    lessonKeys={courseLessons(content, course)
                      .filter((entry) => entry.lesson.status === "ready")
                      .map((entry) => entry.lesson.key)}
                    className="mt-4"
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
