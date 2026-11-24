import { masteryStatus, type MasteryStatus } from "@/lib/mastery/mastery";

import type { Progress } from "./schema";

/** Pure read-outs of progress, for the dashboard and progress indicators. */

export type LessonState = "not-started" | "started" | "completed";

export function lessonState(
  progress: Progress,
  lessonKey: string,
): LessonState {
  return progress.lessons[lessonKey]?.status ?? "not-started";
}

export interface CourseProgress {
  completed: number;
  started: number;
  total: number;
  /** 0 to 1. */
  fraction: number;
}

/** Progress through a set of lessons (the ones that are written). */
export function courseProgress(
  progress: Progress,
  lessonKeys: string[],
): CourseProgress {
  const states = lessonKeys.map((key) => lessonState(progress, key));
  const completed = states.filter((state) => state === "completed").length;
  return {
    completed,
    started: states.filter((state) => state === "started").length,
    total: lessonKeys.length,
    fraction: lessonKeys.length === 0 ? 0 : completed / lessonKeys.length,
  };
}

export function conceptStatus(
  progress: Progress,
  conceptId: string,
): MasteryStatus {
  return masteryStatus(progress.mastery[conceptId]?.score);
}

/** How many of the given concepts are at each status. */
export function countByStatus(
  progress: Progress,
  conceptIds: string[],
): Record<MasteryStatus, number> {
  const counts = { new: 0, learning: 0, practicing: 0, mastered: 0 };
  for (const id of conceptIds) counts[conceptStatus(progress, id)]++;
  return counts;
}

export interface ProgressTotals {
  questionsAnswered: number;
  questionsSolved: number;
  lessonsCompleted: number;
  goalsReached: number;
}

export function progressTotals(progress: Progress): ProgressTotals {
  const questions = Object.values(progress.questions);
  return {
    questionsAnswered: questions.filter((q) => q.attempts > 0).length,
    questionsSolved: questions.filter((q) => q.correct > 0).length,
    lessonsCompleted: Object.values(progress.lessons).filter(
      (lesson) => lesson.status === "completed",
    ).length,
    goalsReached: Object.keys(progress.goals).length,
  };
}
