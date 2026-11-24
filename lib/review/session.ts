import { createRandom } from "@/lib/grading/prng";
import type { QuestionType } from "@/lib/content/vocabulary";

import { isDue, type StoredCard } from "./schedule";

/** Planning a review session. Pure: content facts and progress in, a plan out. */

export interface ReviewableQuestion {
  id: string;
  type: QuestionType;
}

export interface SessionItem {
  conceptId: string;
  questions: ReviewableQuestion[];
}

export const MAX_CONCEPTS_PER_SESSION = 8;
export const QUESTIONS_PER_CONCEPT = 2;

// Quick to answer and freshly numbered first. Code labs are too long for a
// review, so they are never picked.
const preference: Partial<Record<QuestionType, number>> = {
  parametrised: 0,
  numeric: 1,
  expression: 1,
  "multiple-choice": 2,
  "self-check": 3,
};

export function isReviewable(question: ReviewableQuestion): boolean {
  return preference[question.type] !== undefined;
}

/** Concepts with a card that is due and at least one question to ask, most overdue first. */
export function dueConcepts(
  reviews: Record<string, StoredCard>,
  questionsByConcept: Record<string, ReviewableQuestion[]>,
  now: number,
): string[] {
  return Object.entries(reviews)
    .filter(
      ([conceptId, card]) =>
        isDue(card, now) &&
        (questionsByConcept[conceptId] ?? []).some(isReviewable),
    )
    .sort(([, a], [, b]) => a.due - b.due)
    .map(([conceptId]) => conceptId);
}

/** The concept due soonest that is not due yet, if any. */
export function nextDue(
  reviews: Record<string, StoredCard>,
  now: number,
): number | null {
  const upcoming = Object.values(reviews)
    .map((card) => card.due)
    .filter((due) => due > now);
  return upcoming.length > 0 ? Math.min(...upcoming) : null;
}

/**
 * Chooses the questions for a session: up to two per concept, parametrised
 * ones first so the numbers are new, and no question asked twice. `seed`
 * varies the choice between sessions while keeping it repeatable in tests.
 */
export function planSession(
  conceptIds: string[],
  questionsByConcept: Record<string, ReviewableQuestion[]>,
  seed: number,
): SessionItem[] {
  const random = createRandom(seed);
  const used = new Set<string>();
  const items: SessionItem[] = [];

  for (const conceptId of conceptIds.slice(0, MAX_CONCEPTS_PER_SESSION)) {
    const candidates = (questionsByConcept[conceptId] ?? [])
      .filter((question) => isReviewable(question) && !used.has(question.id))
      .map((question) => ({ question, tiebreak: random() }))
      .sort(
        (a, b) =>
          preference[a.question.type]! - preference[b.question.type]! ||
          a.tiebreak - b.tiebreak,
      )
      .slice(0, QUESTIONS_PER_CONCEPT)
      .map((entry) => entry.question);
    if (candidates.length === 0) continue;
    for (const question of candidates) used.add(question.id);
    items.push({ conceptId, questions: candidates });
  }
  return items;
}
