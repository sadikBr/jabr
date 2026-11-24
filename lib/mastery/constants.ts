/**
 * Every number that shapes mastery, in one place so they can be tuned.
 * Mastery is a score from 0 to 1 per concept.
 */

/** Share of the remaining distance to 1 gained by a correct answer with no hints. */
export const BASE_GAIN = 0.3;
/** Each hint used multiplies the gain by this… */
export const HINT_FACTOR = 0.7;
/** …but a correct answer always earns at least this share of the base gain. */
export const MIN_HINT_FACTOR = 0.3;
/** Self-assessed answers (self-check questions) count for less. */
export const SELF_ASSESSED_FACTOR = 0.5;
/** Share of the current score lost by a wrong answer. */
export const BASE_LOSS = 0.15;
/** How much a repeat with different numbers counts, compared with an exact repeat. */
export const VARIANT_REPEAT_WEIGHT = 0.5;

/** Below this a concept is "learning"; from here it is "practicing". */
export const PRACTICING_FROM = 0.3;
/** From here a concept is "mastered". */
export const MASTERED_FROM = 0.8;
