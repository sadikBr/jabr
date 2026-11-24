import { describe, expect, it } from "vitest";

import { masteryStatus, updateMastery } from "./mastery";

const correct = { score: 1, hintsUsed: 0 };
const wrong = { score: 0, hintsUsed: 0 };

/** Applies fresh, distinct attempts one after another. */
function after(
  attempts: Parameters<typeof updateMastery>[1][],
  start?: number,
) {
  return attempts.reduce<number | undefined>(
    (score, attempt) => updateMastery(score, attempt),
    start,
  ) as number;
}

describe("masteryStatus", () => {
  it("is new only when there is no data at all", () => {
    expect(masteryStatus(undefined)).toBe("new");
    expect(masteryStatus(0)).toBe("learning");
  });

  it("uses the thresholds 0.3 and 0.8, inclusive", () => {
    expect(masteryStatus(0.2999)).toBe("learning");
    expect(masteryStatus(0.3)).toBe("practicing");
    expect(masteryStatus(0.7999)).toBe("practicing");
    expect(masteryStatus(0.8)).toBe("mastered");
    expect(masteryStatus(1)).toBe("mastered");
  });
});

describe("updateMastery", () => {
  it("makes a big step for a correct answer with no hints", () => {
    expect(updateMastery(undefined, correct)).toBeCloseTo(0.3, 10);
    expect(updateMastery(0.5, correct)).toBeCloseTo(0.65, 10);
  });

  it("makes a smaller step when hints were used, never less than the floor", () => {
    const none = updateMastery(0, correct);
    const one = updateMastery(0, { score: 1, hintsUsed: 1 });
    const two = updateMastery(0, { score: 1, hintsUsed: 2 });
    const many = updateMastery(0, { score: 1, hintsUsed: 20 });
    expect(one).toBeLessThan(none);
    expect(two).toBeLessThan(one);
    expect(many).toBeCloseTo(0.3 * 0.3, 10);
    expect(many).toBeGreaterThan(0);
  });

  it("goes down after a wrong answer, in proportion to the score", () => {
    expect(updateMastery(0.6, wrong)).toBeCloseTo(0.51, 10);
    expect(updateMastery(0, wrong)).toBe(0);
    expect(updateMastery(undefined, wrong)).toBe(0);
  });

  it("weighs repeated wrong answers on the same item less each time", () => {
    const first = 0.6 - updateMastery(0.6, { ...wrong, priorWrong: 0 });
    const second = 0.6 - updateMastery(0.6, { ...wrong, priorWrong: 1 });
    const third = 0.6 - updateMastery(0.6, { ...wrong, priorWrong: 2 });
    expect(second).toBeCloseTo(first / 2, 10);
    expect(third).toBeCloseTo(first / 3, 10);
  });

  it("needs several different correct answers to reach mastery", () => {
    expect(masteryStatus(after([correct]))).toBe("practicing");
    expect(masteryStatus(after([correct, correct, correct, correct]))).toBe(
      "practicing",
    );
    expect(
      masteryStatus(after([correct, correct, correct, correct, correct])),
    ).toBe("mastered");
  });

  it("cannot be mastered by repeating one question", () => {
    let score: number | undefined;
    for (let i = 0; i < 12; i++) {
      score = updateMastery(score, { ...correct, priorCorrectSame: i });
    }
    expect(masteryStatus(score)).toBe("practicing");
  });

  it("counts the same question with new numbers for half an exact repeat", () => {
    const fresh = updateMastery(0.3, correct);
    const variant = updateMastery(0.3, { ...correct, priorCorrectVariants: 1 });
    const same = updateMastery(0.3, { ...correct, priorCorrectSame: 1 });
    expect(variant).toBeLessThan(fresh);
    expect(variant).toBeGreaterThan(same);
  });

  it("counts self-assessed answers for half", () => {
    const graded = updateMastery(0, correct);
    const selfAssessed = updateMastery(0, { ...correct, selfAssessed: true });
    expect(selfAssessed).toBeCloseTo(graded / 2, 10);
  });

  it("gives partial credit between the wrong and the right outcome", () => {
    const partial = updateMastery(0.5, { score: 0.5, hintsUsed: 0 });
    expect(partial).toBeGreaterThan(updateMastery(0.5, wrong));
    expect(partial).toBeLessThan(updateMastery(0.5, correct));
  });

  it("stays between 0 and 1 whatever happens", () => {
    let score: number | undefined = 0.99;
    for (let i = 0; i < 50; i++) score = updateMastery(score, correct);
    expect(score).toBeLessThanOrEqual(1);
    for (let i = 0; i < 200; i++) score = updateMastery(score, wrong);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(updateMastery(0.5, { score: 7, hintsUsed: 0 })).toBeLessThanOrEqual(
      1,
    );
    expect(
      updateMastery(0.5, { score: -3, hintsUsed: 0 }),
    ).toBeGreaterThanOrEqual(0);
  });

  it("a mistake after mastery does not undo it at once", () => {
    const mastered = after([
      correct,
      correct,
      correct,
      correct,
      correct,
      correct,
    ]);
    expect(masteryStatus(updateMastery(mastered, wrong))).not.toBe("learning");
  });
});
