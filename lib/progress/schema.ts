import { z } from "zod";

import type { StoredCard } from "@/lib/review/schedule";

/**
 * A learner's progress, as kept on their device (localStorage) until accounts
 * arrive. It refers to content by stable ids only. The shapes mirror the
 * database models in prisma/schema.prisma so this can later be merged into an
 * account without translation.
 */

export const PROGRESS_VERSION = 1;
/** How many recent attempts and events to keep. Older ones are dropped. */
export const MAX_ATTEMPTS = 400;
export const MAX_EVENTS = 60;
const MAX_SEEDS = 30;

const timestamp = z.number().int().nonnegative();

const attemptSchema = z.object({
  questionId: z.string(),
  /** Where it was answered: a page path. */
  contextId: z.string(),
  seed: z.number().int(),
  correct: z.boolean(),
  score: z.number().min(0).max(1),
  hintsUsed: z.number().int().nonnegative(),
  at: timestamp,
});

const questionSchema = z.object({
  attempts: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  wrong: z.number().int().nonnegative(),
  /** Times the learner asked to see the solution. */
  revealed: z.number().int().nonnegative(),
  /** Seeds answered correctly, so repeats can be told from new numbers. */
  solvedSeeds: z.array(z.number().int()).max(MAX_SEEDS),
  lastAt: timestamp,
});

const masterySchema = z.object({
  score: z.number().min(0).max(1),
  updatedAt: timestamp,
  /** When the concept first reached "mastered". */
  masteredAt: timestamp.optional(),
});

const lessonSchema = z.object({
  status: z.enum(["started", "completed"]),
  /** Zero-based index of the step last opened. */
  lastStep: z.number().int().nonnegative(),
  startedAt: timestamp,
  updatedAt: timestamp,
  completedAt: timestamp.optional(),
});

const eventSchema = z.object({
  kind: z.enum([
    "mastered",
    "lesson-completed",
    "goal",
    "milestone-passed",
    "project-completed",
  ]),
  /** A concept id, a lesson key, an interactive id, a milestone key or a project id. */
  id: z.string(),
  at: timestamp,
});

const milestoneSchema = z.object({
  status: z.enum(["in_progress", "passed"]),
  startedAt: timestamp,
  updatedAt: timestamp,
  passedAt: timestamp.optional(),
});

const reviewCardSchema = z.object({
  due: timestamp,
  fsrs: z.object({
    stability: z.number(),
    difficulty: z.number(),
    elapsed_days: z.number(),
    scheduled_days: z.number(),
    reps: z.number().int().nonnegative(),
    lapses: z.number().int().nonnegative(),
    learning_steps: z.number().int().nonnegative(),
    state: z.number().int().min(0).max(3),
    last_review: timestamp.optional(),
  }),
}) satisfies z.ZodType<StoredCard>;

export const progressSchema = z.object({
  version: z.literal(PROGRESS_VERSION),
  mastery: z.record(z.string(), masterySchema),
  questions: z.record(z.string(), questionSchema),
  lessons: z.record(z.string(), lessonSchema),
  /** Interactive goals reached, keyed by `<page path>#<interactive id>`. */
  goals: z.record(z.string(), timestamp),
  /**
   * Spaced-review cards by concept id, created when a concept is first
   * mastered. Optional in stored data so progress saved before reviews
   * existed still loads.
   */
  reviews: z.record(z.string(), reviewCardSchema).default({}),
  /**
   * Project milestones by `<project>/<milestone>`. Like `reviews`, optional
   * in stored data so older progress still loads. The code itself is kept
   * by the code lab, under its question id.
   */
  milestones: z.record(z.string(), milestoneSchema).default({}),
  attempts: z.array(attemptSchema),
  events: z.array(eventSchema),
});

export type Progress = z.infer<typeof progressSchema>;
export type Attempt = z.infer<typeof attemptSchema>;
export type QuestionProgress = z.infer<typeof questionSchema>;
export type LessonProgress = z.infer<typeof lessonSchema>;
export type ProgressEvent = z.infer<typeof eventSchema>;

export const EMPTY_PROGRESS: Progress = Object.freeze({
  version: PROGRESS_VERSION,
  mastery: {},
  questions: {},
  lessons: {},
  goals: {},
  reviews: {},
  milestones: {},
  attempts: [],
  events: [],
});

/** Reads stored or imported progress. Anything unreadable is rejected, not guessed at. */
export function parseProgress(value: unknown): Progress | null {
  const result = progressSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function isEmptyProgress(progress: Progress): boolean {
  return (
    progress.attempts.length === 0 &&
    Object.keys(progress.lessons).length === 0 &&
    Object.keys(progress.goals).length === 0 &&
    Object.keys(progress.milestones).length === 0 &&
    Object.keys(progress.mastery).length === 0
  );
}

export { MAX_SEEDS };
