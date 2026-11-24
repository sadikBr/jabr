import {
  type Card,
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Grade,
  Rating,
} from "ts-fsrs";

/**
 * Spaced review scheduling: a thin, pure layer over ts-fsrs (FSRS).
 * Every function takes `now`, so nothing here reads the clock.
 */

// Intervals are in whole days, and the same inputs always give the same
// schedule (no fuzz), which keeps reviews predictable and testable.
const scheduler = fsrs(
  generatorParameters({ enable_fuzz: false, enable_short_term: false }),
);

/** How a review went, from the learner's answers. */
export type ReviewRating = "again" | "hard" | "good";

const grades: Record<ReviewRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
};

/**
 * A review card as it is stored: the FSRS state with dates as timestamps,
 * so it survives JSON. Mirrors the ReviewCard model in prisma/schema.prisma.
 */
export interface StoredCard {
  /** When the concept is next due, in milliseconds since the epoch. */
  due: number;
  fsrs: {
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    learning_steps: number;
    state: number;
    last_review?: number;
  };
}

function toStored(card: Card): StoredCard {
  return {
    due: card.due.getTime(),
    fsrs: {
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      learning_steps: card.learning_steps,
      state: card.state,
      last_review: card.last_review?.getTime(),
    },
  };
}

function fromStored(stored: StoredCard): Card {
  return {
    ...stored.fsrs,
    due: new Date(stored.due),
    last_review:
      stored.fsrs.last_review === undefined
        ? undefined
        : new Date(stored.fsrs.last_review),
  };
}

/**
 * The card created when a concept is first mastered. Mastering it counts as
 * the first good review, so the first real review is a few days away.
 */
export function firstCard(now: number): StoredCard {
  const at = new Date(now);
  return toStored(scheduler.next(createEmptyCard(at), at, Rating.Good).card);
}

/** The card after a review, with its next due date. */
export function rateCard(
  card: StoredCard,
  rating: ReviewRating,
  now: number,
): StoredCard {
  return toStored(
    scheduler.next(fromStored(card), new Date(now), grades[rating]).card,
  );
}

export function isDue(card: StoredCard, now: number): boolean {
  return card.due <= now;
}

export interface ReviewAnswer {
  correct: boolean;
  hintsUsed: number;
}

/**
 * Turns the answers given for one concept into a rating: any miss means it
 * needs to come back soon; right but with hints means it was hard; right
 * with no help is good.
 */
export function ratingFor(answers: ReviewAnswer[]): ReviewRating {
  if (answers.length === 0 || answers.some((answer) => !answer.correct)) {
    return "again";
  }
  return answers.some((answer) => answer.hintsUsed > 0) ? "hard" : "good";
}
