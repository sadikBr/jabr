import type {
  Concept,
  ContentBundle,
  Course,
  CourseModule,
  Explainer,
  Lesson,
  Project,
} from "./types";

/** Pure lookups over a content bundle. Pages call these with the real content. */

export interface CourseLesson {
  lesson: Lesson;
  module: CourseModule;
  /** Position in the whole course, starting at 0. */
  index: number;
}

export function lessonHref(lesson: Pick<Lesson, "key">): string {
  return `/courses/${lesson.key}`;
}

export function getCourse(content: ContentBundle, id: string) {
  return content.courses.find((course) => course.id === id);
}

/** A course's lessons in teaching order. */
export function courseLessons(
  content: ContentBundle,
  course: Course,
): CourseLesson[] {
  const byKey = new Map(content.lessons.map((lesson) => [lesson.key, lesson]));
  return course.modules
    .flatMap((courseModule) =>
      courseModule.lessons.map((id) => ({
        lesson: byKey.get(`${course.id}/${courseModule.id}/${id}`),
        module: courseModule,
      })),
    )
    .filter((entry): entry is Omit<CourseLesson, "index"> => !!entry.lesson)
    .map((entry, index) => ({ ...entry, index }));
}

export function getLesson(content: ContentBundle, key: string) {
  return content.lessons.find((lesson) => lesson.key === key);
}

/** The ready lessons either side of one, skipping lessons not yet written. */
export function lessonNeighbours(
  content: ContentBundle,
  lesson: Lesson,
): { previous?: Lesson; next?: Lesson } {
  const course = getCourse(content, lesson.course);
  if (!course) return {};
  const ready = courseLessons(content, course)
    .map((entry) => entry.lesson)
    .filter((l) => l.status === "ready" || l.key === lesson.key);
  const index = ready.findIndex((l) => l.key === lesson.key);
  return { previous: ready[index - 1], next: ready[index + 1] };
}

export function getConcept(content: ContentBundle, id: string) {
  return content.concepts.find((concept) => concept.id === id);
}

/** Looks up concepts by id, keeping order and dropping unknown ids. */
export function getConcepts(content: ContentBundle, ids: string[]): Concept[] {
  return ids
    .map((id) => getConcept(content, id))
    .filter((concept): concept is Concept => !!concept);
}

export function getExplainer(content: ContentBundle, id: string) {
  return content.explainers.find((explainer) => explainer.id === id);
}

export function getProject(content: ContentBundle, id: string) {
  return content.projects.find((project) => project.id === id);
}

export interface ConceptUsage {
  taughtIn: Lesson[];
  usedInLessons: Lesson[];
  explainers: Explainer[];
  projects: Project[];
  buildsToward: Concept[];
}

/** Everywhere a concept appears. */
export function conceptUsage(content: ContentBundle, id: string): ConceptUsage {
  return {
    taughtIn: content.lessons.filter((lesson) => lesson.teaches.includes(id)),
    usedInLessons: content.lessons.filter((lesson) =>
      lesson.requires.includes(id),
    ),
    explainers: content.explainers.filter((explainer) =>
      explainer.concepts.includes(id),
    ),
    projects: content.projects.filter((project) =>
      project.concepts.includes(id),
    ),
    buildsToward: content.concepts.filter((concept) =>
      concept.prerequisites.includes(id),
    ),
  };
}

export interface CourseStats {
  lessons: number;
  readyLessons: number;
  minutes: number;
  concepts: number;
}

export function courseStats(
  content: ContentBundle,
  course: Course,
): CourseStats {
  const lessons = courseLessons(content, course).map((entry) => entry.lesson);
  return {
    lessons: lessons.length,
    readyLessons: lessons.filter((lesson) => lesson.status === "ready").length,
    minutes: lessons.reduce(
      (total, lesson) => total + (lesson.estimatedMinutes ?? 0),
      0,
    ),
    concepts: new Set(lessons.flatMap((lesson) => lesson.teaches)).size,
  };
}
