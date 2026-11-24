import { describe, expect, it } from "vitest";

import { firstCard, isDue, rateCard, ratingFor } from "./schedule";
import {
  dueConcepts,
  MAX_CONCEPTS_PER_SESSION,
  nextDue,
  planSession,
  type ReviewableQuestion,
} from "./session";

const DAY = 86_400_000;
const start = Date.UTC(2026, 0, 1);
const daysUntilDue = (card: { due: number }, from: number) =>
  Math.round((card.due - from) / DAY);

describe("scheduling", () => {
  it("first comes back a few days after a concept is mastered", () => {
    const card = firstCard(start);
    expect(daysUntilDue(card, start)).toBe(3);
    expect(isDue(card, start)).toBe(false);
    expect(isDue(card, start + 3 * DAY)).toBe(true);
  });

  it("spaces reviews further apart each time they go well", () => {
    let card = firstCard(start);
    let now = card.due;
    const intervals: number[] = [];
    for (let i = 0; i < 4; i++) {
      card = rateCard(card, "good", now);
      intervals.push(daysUntilDue(card, now));
      now = card.due;
    }
    expect(intervals[0]).toBeGreaterThan(3);
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThan(intervals[i - 1]!);
    }
  });

  it("brings a forgotten concept back sooner than a remembered one", () => {
    const card = firstCard(start);
    const again = rateCard(card, "again", card.due);
    const hard = rateCard(card, "hard", card.due);
    const good = rateCard(card, "good", card.due);
    expect(again.due).toBeLessThan(hard.due);
    expect(hard.due).toBeLessThan(good.due);
    expect(again.fsrs.lapses).toBe(1);
  });

  it("is deterministic and survives being saved as JSON", () => {
    const card = firstCard(start);
    const restored = JSON.parse(JSON.stringify(card));
    expect(rateCard(restored, "good", card.due)).toEqual(
      rateCard(card, "good", card.due),
    );
    expect(firstCard(start)).toEqual(card);
  });
});

describe("ratingFor", () => {
  it("rates from the answers given for the concept", () => {
    expect(
      ratingFor([
        { correct: true, hintsUsed: 0 },
        { correct: true, hintsUsed: 0 },
      ]),
    ).toBe("good");
    expect(
      ratingFor([
        { correct: true, hintsUsed: 1 },
        { correct: true, hintsUsed: 0 },
      ]),
    ).toBe("hard");
    expect(
      ratingFor([
        { correct: true, hintsUsed: 0 },
        { correct: false, hintsUsed: 0 },
      ]),
    ).toBe("again");
    expect(ratingFor([])).toBe("again");
  });
});

const q = (
  id: string,
  type: ReviewableQuestion["type"],
): ReviewableQuestion => ({ id, type });
const questions: Record<string, ReviewableQuestion[]> = {
  slope: [
    q("s.mc", "multiple-choice"),
    q("s.param", "parametrised"),
    q("s.code", "code"),
    q("s.num", "numeric"),
  ],
  tangent: [q("s.param", "parametrised"), q("t.self", "self-check")],
  limit: [q("l.code", "code")],
};

describe("dueConcepts", () => {
  const card = (dueInDays: number) => ({
    ...firstCard(start),
    due: start + dueInDays * DAY,
  });
  const reviews = {
    slope: card(-1),
    tangent: card(-5),
    integral: card(-2),
    limit: card(-9),
    later: card(4),
  };

  it("lists due concepts that have something to ask, most overdue first", () => {
    // "integral" has no questions and "limit" only a code lab.
    expect(dueConcepts(reviews, questions, start)).toEqual([
      "tangent",
      "slope",
    ]);
  });

  it("knows when the next review is", () => {
    expect(nextDue(reviews, start)).toBe(start + 4 * DAY);
    expect(nextDue({ slope: card(-1) }, start)).toBeNull();
    expect(nextDue({}, start)).toBeNull();
  });
});

describe("planSession", () => {
  it("asks up to two questions per concept, parametrised first, never code", () => {
    const [slope] = planSession(["slope"], questions, 1);
    expect(slope?.questions.map((x) => x.id)).toEqual(["s.param", "s.num"]);
  });

  it("does not ask the same question twice in a session", () => {
    const plan = planSession(["slope", "tangent"], questions, 1);
    expect(plan[1]).toEqual({
      conceptId: "tangent",
      questions: [q("t.self", "self-check")],
    });
    const asked = plan.flatMap((item) => item.questions.map((x) => x.id));
    expect(new Set(asked).size).toBe(asked.length);
  });

  it("leaves out concepts with nothing to ask", () => {
    expect(
      planSession(["limit", "ghost", "slope"], questions, 1).map(
        (i) => i.conceptId,
      ),
    ).toEqual(["slope"]);
  });

  it("caps the session length", () => {
    const many = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`c${i}`, [q(`q${i}`, "numeric")]]),
    );
    expect(planSession(Object.keys(many), many, 1)).toHaveLength(
      MAX_CONCEPTS_PER_SESSION,
    );
  });

  it("varies the choice with the seed but repeats for the same seed", () => {
    const pool = {
      c: Array.from({ length: 8 }, (_, i) => q(`q${i}`, "numeric")),
    };
    const pick = (seed: number) =>
      planSession(["c"], pool, seed)[0]!
        .questions.map((x) => x.id)
        .join();
    expect(pick(1)).toBe(pick(1));
    expect(new Set([1, 2, 3, 4, 5, 6].map(pick)).size).toBeGreaterThan(1);
  });
});
