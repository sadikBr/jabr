import "server-only";

import type { ProgressCatalog } from "@/components/progress/catalog";
import { interactiveSpecs } from "@/lib/content/interactive-specs";
import { courseLessons, lessonHref } from "@/lib/content/queries";
import { content } from "@/lib/content/source";

/** What the progress views need to know about the content. */
export function buildProgressCatalog(): ProgressCatalog {
  const courses = content.courses.map((course) => ({
    course,
    lessons: courseLessons(content, course)
      .map((entry) => entry.lesson)
      .filter((lesson) => lesson.status === "ready"),
  }));
  return {
    lessons: courses.flatMap(({ course, lessons }) =>
      lessons.map((lesson) => ({
        key: lesson.key,
        title: lesson.title,
        href: lessonHref(lesson),
        steps: lesson.refs.steps.length,
        courseTitle: course.title,
        subject: course.subject,
      })),
    ),
    courses: courses.map(({ course, lessons }) => ({
      id: course.id,
      title: course.title,
      subject: course.subject,
      lessonKeys: lessons.map((lesson) => lesson.key),
    })),
    concepts: content.concepts.map(({ id, title, subject }) => ({
      id,
      title,
      subject,
    })),
    interactives: Object.fromEntries(
      Object.entries(interactiveSpecs).map(([id, spec]) => [id, spec.title]),
    ),
  };
}
