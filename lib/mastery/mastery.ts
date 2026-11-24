import {
  BASE_GAIN,
  BASE_LOSS,
  HINT_FACTOR,
  MASTERED_FROM,
  MIN_HINT_FACTOR,
  PRACTICING_FROM,
  SELF_ASSESSED_FACTOR,
  VARIANT_REPEAT_WEIGHT,
} from "./constants";

export const masteryStatuses = [
  "new",
  "learning",
  "practicing",
  "mastered",
] as const;
export type MasteryStatus = (typeof masteryStatuses)[number];

/** `undefined` means the learner has never attempted anything on the concept. */
export function masteryStatus(score: number | undefined): MasteryStatus {
  if (score === undefined) return "new";
  if (score >= MASTERED_FROM) return "mastered";
  if (score >= PRACTICING_FROM) return "practicing";
  return "learning";
}

export interface AttemptForMastery {
  /** 0 to 1, as returned by the grader. */
  score: number;
  hintsUsed: number;
  /** The learner marked their own answer (self-check questions). */
  selfAssessed?: boolean;
  /** Earlier correct answers to this same question with the same numbers. */
  priorCorrectSame?: number;
  /** Earlier correct answers to this question with other numbers. */
  priorCorrectVariants?: number;
  /** Earlier wrong answers to this same question. */
  priorWrong?: number;
}

/**
 * The new mastery score for one concept after one attempt.
 *
 * A correct answer closes part of the gap to 1: a big step with no hints, a
 * smaller one with hints, and less again when the same item has already been
 * answered correctly (so repeating one question cannot reach mastery).
 * A wrong answer takes away part of the current score, and repeated wrong
 * answers on the same item take away less each time.
 * Partial credit mixes the two in proportion.
 */
export function updateMastery(
  current: number | undefined,
  attempt: AttemptForMastery,
): number {
  const score = Math.min(Math.max(attempt.score, 0), 1);
  const start = current ?? 0;

  const hintFactor = Math.max(
    HINT_FACTOR ** attempt.hintsUsed,
    MIN_HINT_FACTOR,
  );
  const repeats =
    (attempt.priorCorrectSame ?? 0) +
    VARIANT_REPEAT_WEIGHT * (attempt.priorCorrectVariants ?? 0);
  const gain =
    (BASE_GAIN *
      hintFactor *
      (attempt.selfAssessed ? SELF_ASSESSED_FACTOR : 1)) /
    (1 + repeats);
  const loss = BASE_LOSS / (1 + (attempt.priorWrong ?? 0));

  const next = start + gain * score * (1 - start) - loss * (1 - score) * start;
  return Math.min(Math.max(next, 0), 1);
}
