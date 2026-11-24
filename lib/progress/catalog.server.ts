import "server-only";

import type { LearnLink, ProgressCatalog } from "@/components/progress/catalog";
import { interactiveSpecs } from "@/lib/content/interactive-specs";
import { courseLessons, lessonHref } from "@/lib/content/queries";
import { content } from "@/lib/content/source";

/** What the progress views need to know about the content. */
export function buildProgressCatalog(): ProgressCatalog {
  const courses = content.courses.map((course) => {
    const all = courseLessons(content, course).map((entry) => entry.lesson);
    return {
      course,
      all,
      ready: all.filter((lesson) => lesson.status === "ready"),
    };
  });

  const questionsByConcept: ProgressCatalog["questionsByConcept"] = {};
  for (const question of content.questions) {
    for (const conceptId of question.concepts) {
      (questionsByConcept[conceptId] ??= []).push({
        id: question.id,
        type: question.type,
      });
    }
  }

  return {
    lessons: courses.flatMap(({ course, ready }) =>
      ready.map((lesson) => ({
        key: lesson.key,
        title: lesson.title,
        href: lessonHref(lesson),
        steps: lesson.refs.steps.length,
        courseId: course.id,
        courseTitle: course.title,
        subject: course.subject,
        teaches: lesson.teaches,
        requires: lesson.requires,
      })),
    ),
    courses: courses.map(({ course, all, ready }) => ({
      id: course.id,
      title: course.title,
      subject: course.subject,
      lessonKeys: ready.map((lesson) => lesson.key),
      conceptIds: [...new Set(all.flatMap((lesson) => lesson.teaches))],
    })),
    concepts: content.concepts.map(({ id, title, subject, prerequisites }) => ({
      id,
      title,
      subject,
      prerequisites,
    })),
    questionsByConcept,
    projects: content.projects.map(({ id, title, concepts }) => ({
      id,
      title,
      concepts,
    })),
    interactives: Object.fromEntries(
      Object.entries(interactiveSpecs).map(([id, spec]) => [id, spec.title]),
    ),
  };
}

/**
 * Where to learn a concept: the first written lesson that teaches it (other
 * than `exceptLessonKey`), otherwise the concept's own page.
 */
export function learnLink(
  conceptId: string,
  exceptLessonKey?: string,
): LearnLink {
  const lesson = content.lessons.find(
    (candidate) =>
      candidate.status === "ready" &&
      candidate.key !== exceptLessonKey &&
      candidate.teaches.includes(conceptId),
  );
  return lesson
    ? { href: lessonHref(lesson), lessonTitle: lesson.title }
    : { href: `/concepts/${conceptId}` };
}
