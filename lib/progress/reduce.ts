import {
  masteryStatus,
  type MasteryStatus,
  updateMastery,
} from "@/lib/mastery/mastery";
import { firstCard, rateCard, type ReviewRating } from "@/lib/review/schedule";

import {
  MAX_ATTEMPTS,
  MAX_EVENTS,
  MAX_SEEDS,
  type Progress,
  type ProgressEvent,
} from "./schema";

/**
 * Pure updates to a learner's progress: each takes the current progress and
 * returns a new one. Nothing here reads the clock or touches storage.
 */

export interface AttemptInput {
  questionId: string;
  /** Concepts the question is tagged with. */
  concepts: string[];
  contextId: string;
  seed: number;
  correct: boolean;
  score: number;
  hintsUsed: number;
  selfAssessed?: boolean;
}

export interface MasteryChange {
  conceptId: string;
  from: MasteryStatus;
  to: MasteryStatus;
}

function withEvents(progress: Progress, events: ProgressEvent[]): Progress {
  if (events.length === 0) return progress;
  return {
    ...progress,
    events: [...progress.events, ...events].slice(-MAX_EVENTS),
  };
}

/**
 * Records one graded answer: the attempt itself, the question's tallies and
 * the mastery of every concept the question is tagged with. Also returns the
 * concepts whose status changed, so the UI can say so.
 */
export function applyAttempt(
  progress: Progress,
  input: AttemptInput,
  now: number,
): { progress: Progress; changes: MasteryChange[] } {
  const previous = progress.questions[input.questionId];
  const solvedSeeds = previous?.solvedSeeds ?? [];
  const priorCorrectSame = solvedSeeds.filter((s) => s === input.seed).length;

  const mastery = { ...progress.mastery };
  const reviews = { ...progress.reviews };
  const changes: MasteryChange[] = [];
  const events: ProgressEvent[] = [];
  for (const conceptId of new Set(input.concepts)) {
    const before = mastery[conceptId];
    const score = updateMastery(before?.score, {
      score: input.score,
      hintsUsed: input.hintsUsed,
      selfAssessed: input.selfAssessed,
      priorCorrectSame,
      priorCorrectVariants: solvedSeeds.length - priorCorrectSame,
      priorWrong: previous?.wrong ?? 0,
    });
    const from = masteryStatus(before?.score);
    const to = masteryStatus(score);
    const firstTimeMastered = to === "mastered" && !before?.masteredAt;
    mastery[conceptId] = {
      score,
      updatedAt: now,
      masteredAt: firstTimeMastered ? now : before?.masteredAt,
    };
    if (from !== to) changes.push({ conceptId, from, to });
    if (firstTimeMastered) {
      events.push({ kind: "mastered", id: conceptId, at: now });
      // A mastered concept comes back for review so it stays mastered.
      reviews[conceptId] ??= firstCard(now);
    }
  }

  const next: Progress = {
    ...progress,
    mastery,
    reviews,
    questions: {
      ...progress.questions,
      [input.questionId]: {
        attempts: (previous?.attempts ?? 0) + 1,
        correct: (previous?.correct ?? 0) + (input.correct ? 1 : 0),
        wrong: (previous?.wrong ?? 0) + (input.correct ? 0 : 1),
        revealed: previous?.revealed ?? 0,
        solvedSeeds: input.correct
          ? [...solvedSeeds, input.seed].slice(-MAX_SEEDS)
          : solvedSeeds,
        lastAt: now,
      },
    },
    attempts: [
      ...progress.attempts,
      {
        questionId: input.questionId,
        contextId: input.contextId,
        seed: input.seed,
        correct: input.correct,
        score: input.score,
        hintsUsed: input.hintsUsed,
        at: now,
      },
    ].slice(-MAX_ATTEMPTS),
  };
  return { progress: withEvents(next, events), changes };
}

/**
 * Records that the learner asked to see a solution. It counts against the
 * concepts like a wrong answer, since the question was not solved.
 */
export function applyReveal(
  progress: Progress,
  input: Omit<AttemptInput, "correct" | "score" | "hintsUsed" | "selfAssessed">,
  now: number,
): { progress: Progress; changes: MasteryChange[] } {
  const result = applyAttempt(
    progress,
    { ...input, correct: false, score: 0, hintsUsed: 0 },
    now,
  );
  const question = result.progress.questions[input.questionId]!;
  return {
    ...result,
    progress: {
      ...result.progress,
      questions: {
        ...result.progress.questions,
        [input.questionId]: { ...question, revealed: question.revealed + 1 },
      },
    },
  };
}

/** Records the step a learner has opened in a lesson. */
export function applyLessonStep(
  progress: Progress,
  lessonKey: string,
  step: number,
  now: number,
): Progress {
  const previous = progress.lessons[lessonKey];
  if (previous?.lastStep === step) return progress;
  return {
    ...progress,
    lessons: {
      ...progress.lessons,
      [lessonKey]: {
        status: previous?.status ?? "started",
        lastStep: step,
        startedAt: previous?.startedAt ?? now,
        updatedAt: now,
        completedAt: previous?.completedAt,
      },
    },
  };
}

/** Marks a lesson finished. Finishing it again changes nothing. */
export function applyLessonCompleted(
  progress: Progress,
  lessonKey: string,
  now: number,
): Progress {
  const previous = progress.lessons[lessonKey];
  if (previous?.status === "completed") return progress;
  return withEvents(
    {
      ...progress,
      lessons: {
        ...progress.lessons,
        [lessonKey]: {
          status: "completed",
          lastStep: previous?.lastStep ?? 0,
          startedAt: previous?.startedAt ?? now,
          updatedAt: now,
          completedAt: now,
        },
      },
    },
    [{ kind: "lesson-completed", id: lessonKey, at: now }],
  );
}

/**
 * Records the outcome of reviewing a concept: its card is rescheduled.
 * (The answers themselves went through applyAttempt and updated mastery.)
 */
export function applyReview(
  progress: Progress,
  conceptId: string,
  rating: ReviewRating,
  now: number,
): Progress {
  const card = progress.reviews[conceptId];
  if (!card) return progress;
  return {
    ...progress,
    reviews: { ...progress.reviews, [conceptId]: rateCard(card, rating, now) },
  };
}

/** Records the first time an interactive's goal is reached on a page. */
export function applyGoal(
  progress: Progress,
  contextId: string,
  interactiveId: string,
  now: number,
): Progress {
  const key = `${contextId}#${interactiveId}`;
  if (progress.goals[key] !== undefined) return progress;
  return withEvents({ ...progress, goals: { ...progress.goals, [key]: now } }, [
    { kind: "goal", id: interactiveId, at: now },
  ]);
}
