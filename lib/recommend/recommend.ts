import { masteryStatus, masteryStatuses } from "@/lib/mastery/mastery";

/**
 * What to learn next, and what is missing before a lesson or a project.
 * Pure: it works on plain facts about the content plus the learner's
 * mastery scores, so it can be unit-tested on small made-up graphs.
 */

export interface LessonFacts {
  key: string;
  teaches: string[];
  requires: string[];
  /** False for lessons that are planned but not written. */
  ready: boolean;
}

export interface LearnerState {
  /** Mastery score by concept id; a missing id means never attempted. */
  mastery: Record<string, number | undefined>;
  completedLessons: ReadonlySet<string>;
}

const PRACTICING = masteryStatuses.indexOf("practicing");

/** True when the learner is at least "practicing" the concept. */
export function knows(state: LearnerState, conceptId: string): boolean {
  return (
    masteryStatuses.indexOf(masteryStatus(state.mastery[conceptId])) >=
    PRACTICING
  );
}

/** The concepts from a list that the learner is not yet practicing. */
export function gaps(state: LearnerState, conceptIds: string[]): string[] {
  return conceptIds.filter((id) => !knows(state, id));
}

/**
 * A written lesson the learner has not finished that teaches the concept,
 * preferring the earliest. Null when there is nothing to send them to.
 */
export function lessonToLearn(
  lessons: LessonFacts[],
  state: LearnerState,
  conceptId: string,
  except?: string,
): LessonFacts | null {
  return (
    lessons.find(
      (lesson) =>
        lesson.ready &&
        lesson.key !== except &&
        !state.completedLessons.has(lesson.key) &&
        lesson.teaches.includes(conceptId),
    ) ?? null
  );
}

export type NextStep =
  /** Take this lesson. `gaps` are concepts it uses that are still weak. */
  | { kind: "lesson"; lessonKey: string; gaps: string[] }
  /** First take `lessonKey`, which teaches `conceptId`, needed by `forLesson`. */
  | {
      kind: "prerequisite";
      lessonKey: string;
      conceptId: string;
      forLesson: string;
    }
  | { kind: "done" };

/**
 * The next step through an ordered list of lessons (a course).
 *
 * It is the first written lesson not yet finished. But if that lesson
 * requires a concept the learner is not yet practicing, and another written,
 * unfinished lesson teaches it, that lesson comes first. A gap that nothing
 * can fill yet does not block the learner: it is reported with the lesson.
 */
export function nextStep(
  lessons: LessonFacts[],
  state: LearnerState,
): NextStep {
  const target = lessons.find(
    (lesson) => lesson.ready && !state.completedLessons.has(lesson.key),
  );
  if (!target) return { kind: "done" };

  const missing = gaps(state, target.requires);
  for (const conceptId of missing) {
    const prerequisite = lessonToLearn(lessons, state, conceptId, target.key);
    if (prerequisite) {
      return {
        kind: "prerequisite",
        lessonKey: prerequisite.key,
        conceptId,
        forLesson: target.key,
      };
    }
  }
  return { kind: "lesson", lessonKey: target.key, gaps: missing };
}

export interface Readiness {
  /** 0 to 1: the share of the needed concepts the learner is practicing. */
  fraction: number;
  /** Concepts still to learn, in the order given. */
  toLearn: string[];
}

/** How ready the learner is for something that needs these concepts. */
export function readiness(
  state: LearnerState,
  conceptIds: string[],
): Readiness {
  const unique = [...new Set(conceptIds)];
  const toLearn = gaps(state, unique);
  return {
    fraction:
      unique.length === 0
        ? 1
        : (unique.length - toLearn.length) / unique.length,
    toLearn,
  };
}

export interface ConceptFacts {
  id: string;
  prerequisites: string[];
}

/**
 * Concepts the learner is ready to pick up: not yet practicing, with every
 * prerequisite at least practicing. Concepts with no prerequisites count.
 */
export function frontier(
  concepts: ConceptFacts[],
  state: LearnerState,
): string[] {
  return concepts
    .filter(
      (concept) =>
        !knows(state, concept.id) &&
        concept.prerequisites.every((id) => knows(state, id)),
    )
    .map((concept) => concept.id);
}
