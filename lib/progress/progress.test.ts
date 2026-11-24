import { beforeEach, describe, expect, it } from "vitest";

import {
  applyAttempt,
  applyGoal,
  applyLessonCompleted,
  applyLessonStep,
  applyReveal,
  applyReview,
  type AttemptInput,
} from "./reduce";
import {
  EMPTY_PROGRESS,
  isEmptyProgress,
  MAX_ATTEMPTS,
  parseProgress,
  type Progress,
} from "./schema";
import {
  clearProgressCache,
  getProgress,
  importProgress,
  PROGRESS_KEY,
  recordAttempt,
  recordLessonCompleted,
  resetProgress,
  subscribeToProgress,
} from "./store";
import {
  conceptStatus,
  countByStatus,
  courseProgress,
  lessonState,
  progressTotals,
} from "./summary";

const attempt = (overrides: Partial<AttemptInput> = {}): AttemptInput => ({
  questionId: "q1",
  concepts: ["slope"],
  contextId: "/lesson",
  seed: 1,
  correct: true,
  score: 1,
  hintsUsed: 0,
  ...overrides,
});

/** Applies attempts in order, one second apart. */
function play(inputs: AttemptInput[], start: Progress = EMPTY_PROGRESS) {
  return inputs.reduce(
    (progress, input, i) =>
      applyAttempt(progress, input, 1000 * (i + 1)).progress,
    start,
  );
}

describe("applyAttempt", () => {
  it("records the attempt, the question tally and mastery for each concept", () => {
    const { progress, changes } = applyAttempt(
      EMPTY_PROGRESS,
      attempt({ concepts: ["slope", "tangent"] }),
      5000,
    );
    expect(progress.attempts).toEqual([
      {
        questionId: "q1",
        contextId: "/lesson",
        seed: 1,
        correct: true,
        score: 1,
        hintsUsed: 0,
        at: 5000,
      },
    ]);
    expect(progress.questions.q1).toMatchObject({
      attempts: 1,
      correct: 1,
      wrong: 0,
      solvedSeeds: [1],
    });
    expect(progress.mastery.slope).toEqual({
      score: 0.3,
      updatedAt: 5000,
      masteredAt: undefined,
    });
    expect(progress.mastery.tangent?.score).toBe(0.3);
    expect(changes).toEqual([
      { conceptId: "slope", from: "new", to: "practicing" },
      { conceptId: "tangent", from: "new", to: "practicing" },
    ]);
  });

  it("does not change the progress it was given", () => {
    const before = structuredClone(EMPTY_PROGRESS);
    applyAttempt(EMPTY_PROGRESS, attempt(), 1);
    expect(EMPTY_PROGRESS).toEqual(before);
  });

  it("a first wrong answer moves a concept from new to learning", () => {
    const { progress, changes } = applyAttempt(
      EMPTY_PROGRESS,
      attempt({ correct: false, score: 0 }),
      1,
    );
    expect(conceptStatus(progress, "slope")).toBe("learning");
    expect(changes).toEqual([
      { conceptId: "slope", from: "new", to: "learning" },
    ]);
    expect(progress.questions.q1).toMatchObject({
      correct: 0,
      wrong: 1,
      solvedSeeds: [],
    });
  });

  it("reaches mastery through different questions and records when", () => {
    const progress = play(
      ["a", "b", "c", "d", "e"].map((questionId) => attempt({ questionId })),
    );
    expect(conceptStatus(progress, "slope")).toBe("mastered");
    expect(progress.mastery.slope?.masteredAt).toBe(5000);
    expect(progress.events).toEqual([
      { kind: "mastered", id: "slope", at: 5000 },
    ]);
  });

  it("records mastery only the first time", () => {
    let progress = play(
      ["a", "b", "c", "d", "e"].map((questionId) => attempt({ questionId })),
    );
    // Drop out of mastery, then come back.
    progress = play(
      [
        attempt({ questionId: "f", correct: false, score: 0 }),
        attempt({ questionId: "g", correct: false, score: 0 }),
        attempt({ questionId: "h" }),
        attempt({ questionId: "i" }),
      ],
      progress,
    );
    expect(progress.events.filter((e) => e.kind === "mastered")).toHaveLength(
      1,
    );
    expect(progress.mastery.slope?.masteredAt).toBe(5000);
  });

  it("gives less for repeating the same question than for a new one", () => {
    const repeated = play([
      attempt(),
      attempt(),
      attempt(),
      attempt(),
      attempt(),
      attempt(),
    ]);
    const varied = play(
      ["a", "b", "c", "d", "e", "f"].map((questionId) =>
        attempt({ questionId }),
      ),
    );
    expect(repeated.mastery.slope!.score).toBeLessThan(
      varied.mastery.slope!.score,
    );
    expect(conceptStatus(repeated, "slope")).toBe("practicing");
  });

  it("counts new numbers on the same question for more than an exact repeat", () => {
    const sameNumbers = play([attempt({ seed: 1 }), attempt({ seed: 1 })]);
    const newNumbers = play([attempt({ seed: 1 }), attempt({ seed: 2 })]);
    expect(newNumbers.mastery.slope!.score).toBeGreaterThan(
      sameNumbers.mastery.slope!.score,
    );
  });

  it("counts a duplicated concept tag once", () => {
    const { progress } = applyAttempt(
      EMPTY_PROGRESS,
      attempt({ concepts: ["slope", "slope"] }),
      1,
    );
    expect(progress.mastery.slope?.score).toBe(0.3);
  });

  it("keeps only the most recent attempts", () => {
    const many = Array.from({ length: MAX_ATTEMPTS + 25 }, (_, i) =>
      attempt({ questionId: `q${i}` }),
    );
    const progress = play(many);
    expect(progress.attempts).toHaveLength(MAX_ATTEMPTS);
    expect(progress.attempts[0]?.questionId).toBe("q25");
    // Tallies are kept for every question all the same.
    expect(Object.keys(progress.questions)).toHaveLength(MAX_ATTEMPTS + 25);
  });
});

describe("reviews", () => {
  const DAY = 86_400_000;
  const mastered = () =>
    play(
      ["a", "b", "c", "d", "e"].map((questionId) => attempt({ questionId })),
    );

  it("creates a review card when a concept is first mastered, due in a few days", () => {
    const beforeMastery = play(
      ["a", "b", "c", "d"].map((questionId) => attempt({ questionId })),
    );
    expect(beforeMastery.reviews).toEqual({});
    const progress = mastered();
    expect(Object.keys(progress.reviews)).toEqual(["slope"]);
    expect(progress.reviews.slope!.due).toBe(5000 + 3 * DAY);
  });

  it("keeps the existing card if mastery is lost and regained", () => {
    const progress = mastered();
    const card = progress.reviews.slope;
    const again = play(
      [
        attempt({ questionId: "f", correct: false, score: 0 }),
        attempt({ questionId: "g", correct: false, score: 0 }),
        attempt({ questionId: "h" }),
        attempt({ questionId: "i" }),
      ],
      progress,
    );
    expect(again.reviews.slope).toBe(card);
  });

  it("reschedules a card after a review, sooner if it went badly", () => {
    const progress = mastered();
    const due = progress.reviews.slope!.due;
    const good = applyReview(progress, "slope", "good", due);
    const again = applyReview(progress, "slope", "again", due);
    expect(good.reviews.slope!.due).toBeGreaterThan(due + 3 * DAY);
    expect(again.reviews.slope!.due).toBeLessThan(good.reviews.slope!.due);
    expect(again.reviews.slope!.due).toBeGreaterThan(due);
  });

  it("ignores a review for a concept with no card", () => {
    expect(applyReview(EMPTY_PROGRESS, "slope", "good", 1)).toBe(
      EMPTY_PROGRESS,
    );
  });

  it("loads progress saved before reviews existed", () => {
    const old = JSON.parse(JSON.stringify(mastered()));
    delete old.reviews;
    expect(parseProgress(old)?.reviews).toEqual({});
  });
});

describe("applyReveal", () => {
  it("counts against the concept and is tallied separately", () => {
    const started = play([
      attempt({ questionId: "a" }),
      attempt({ questionId: "b" }),
    ]);
    const { progress } = applyReveal(
      started,
      { questionId: "q1", concepts: ["slope"], contextId: "/lesson", seed: 1 },
      9000,
    );
    expect(progress.mastery.slope!.score).toBeLessThan(
      started.mastery.slope!.score,
    );
    expect(progress.questions.q1).toMatchObject({
      revealed: 1,
      wrong: 1,
      correct: 0,
    });
  });
});

describe("lessons and goals", () => {
  it("tracks the step reached and completion", () => {
    let progress = applyLessonStep(EMPTY_PROGRESS, "calc/intro", 0, 100);
    expect(lessonState(progress, "calc/intro")).toBe("started");
    progress = applyLessonStep(progress, "calc/intro", 2, 200);
    expect(progress.lessons["calc/intro"]).toMatchObject({
      lastStep: 2,
      startedAt: 100,
      updatedAt: 200,
    });

    progress = applyLessonCompleted(progress, "calc/intro", 300);
    expect(progress.lessons["calc/intro"]).toMatchObject({
      status: "completed",
      completedAt: 300,
      startedAt: 100,
    });
    expect(progress.events).toEqual([
      { kind: "lesson-completed", id: "calc/intro", at: 300 },
    ]);
  });

  it("stays completed when the lesson is revisited or finished again", () => {
    let progress = applyLessonCompleted(EMPTY_PROGRESS, "calc/intro", 300);
    const again = applyLessonCompleted(progress, "calc/intro", 400);
    expect(again).toBe(progress);
    progress = applyLessonStep(progress, "calc/intro", 1, 500);
    expect(progress.lessons["calc/intro"]).toMatchObject({
      status: "completed",
      completedAt: 300,
      lastStep: 1,
    });
  });

  it("returns the same object when nothing changes", () => {
    const progress = applyLessonStep(EMPTY_PROGRESS, "calc/intro", 1, 100);
    expect(applyLessonStep(progress, "calc/intro", 1, 200)).toBe(progress);
  });

  it("records a goal once per page", () => {
    let progress = applyGoal(EMPTY_PROGRESS, "/", "projectile-sim", 100);
    expect(applyGoal(progress, "/", "projectile-sim", 200)).toBe(progress);
    progress = applyGoal(progress, "/explore/x", "projectile-sim", 300);
    expect(Object.keys(progress.goals)).toHaveLength(2);
    expect(progress.events.map((e) => e.kind)).toEqual(["goal", "goal"]);
  });
});

describe("summaries", () => {
  const keys = ["c/a", "c/b", "c/c", "c/d"];
  let progress = applyLessonCompleted(EMPTY_PROGRESS, "c/a", 100);
  progress = applyLessonStep(progress, "c/b", 2, 200);
  progress = applyLessonStep(progress, "c/c", 1, 300);

  it("measures progress through a course", () => {
    expect(courseProgress(progress, keys)).toEqual({
      completed: 1,
      started: 2,
      total: 4,
      fraction: 0.25,
    });
    expect(courseProgress(EMPTY_PROGRESS, [])).toMatchObject({ fraction: 0 });
  });

  it("counts concepts by status and totals", () => {
    const played = play([
      attempt({ questionId: "a", concepts: ["slope"] }),
      attempt({
        questionId: "b",
        concepts: ["limit"],
        correct: false,
        score: 0,
      }),
    ]);
    expect(countByStatus(played, ["slope", "limit", "integral"])).toEqual({
      new: 1,
      learning: 1,
      practicing: 1,
      mastered: 0,
    });
    expect(progressTotals(played)).toEqual({
      questionsAnswered: 2,
      questionsSolved: 1,
      lessonsCompleted: 0,
      goalsReached: 0,
    });
  });
});

describe("parseProgress", () => {
  it("round-trips real progress through JSON", () => {
    const progress = applyLessonCompleted(play([attempt()]), "c/a", 50);
    expect(parseProgress(JSON.parse(JSON.stringify(progress)))).toEqual(
      JSON.parse(JSON.stringify(progress)),
    );
  });

  it.each([
    ["null", null],
    ["a string", "progress"],
    ["another version", { ...EMPTY_PROGRESS, version: 2 }],
    [
      "a mastery score out of range",
      { ...EMPTY_PROGRESS, mastery: { slope: { score: 4, updatedAt: 1 } } },
    ],
    ["a missing section", { version: 1, mastery: {} }],
  ])("rejects %s", (_label, value) => {
    expect(parseProgress(value)).toBeNull();
  });

  it("knows empty from not empty", () => {
    expect(isEmptyProgress(EMPTY_PROGRESS)).toBe(true);
    expect(isEmptyProgress(applyGoal(EMPTY_PROGRESS, "/", "sim", 1))).toBe(
      false,
    );
  });
});

describe("store", () => {
  beforeEach(() => {
    localStorage.clear();
    clearProgressCache();
  });

  it("starts empty and saves each change to this device", () => {
    expect(getProgress()).toBe(EMPTY_PROGRESS);
    const changes = recordAttempt(attempt());
    expect(changes).toEqual([
      { conceptId: "slope", from: "new", to: "practicing" },
    ]);
    expect(
      JSON.parse(localStorage.getItem(PROGRESS_KEY)!).mastery.slope.score,
    ).toBe(0.3);

    clearProgressCache(); // as if the page were reloaded
    expect(getProgress().questions.q1?.correct).toBe(1);
  });

  it("tells subscribers about changes, and stops when they unsubscribe", () => {
    let calls = 0;
    const unsubscribe = subscribeToProgress(() => calls++);
    recordLessonCompleted("c/a");
    expect(calls).toBe(1);
    recordLessonCompleted("c/a"); // no change, no notification
    expect(calls).toBe(1);
    unsubscribe();
    resetProgress();
    expect(calls).toBe(1);
  });

  it("ignores stored data it cannot read instead of crashing", () => {
    localStorage.setItem(PROGRESS_KEY, "{not json");
    expect(getProgress()).toBe(EMPTY_PROGRESS);
    clearProgressCache();
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: 99 }));
    expect(getProgress()).toBe(EMPTY_PROGRESS);
  });

  it("imports valid progress, refuses anything else, and resets", () => {
    recordAttempt(attempt());
    const exported = JSON.parse(JSON.stringify(getProgress()));
    resetProgress();
    expect(isEmptyProgress(getProgress())).toBe(true);

    expect(importProgress({ hello: "world" })).toBe(false);
    expect(isEmptyProgress(getProgress())).toBe(true);
    expect(importProgress(exported)).toBe(true);
    expect(getProgress().mastery.slope?.score).toBe(0.3);
  });
});
