import { describe, expect, it } from "vitest";

import {
  frontier,
  gaps,
  type LearnerState,
  type LessonFacts,
  nextStep,
  readiness,
} from "./recommend";

// A small course: slope → derivative → rules, plus motion which also needs
// "vectors", a concept no lesson here teaches.
const lessons: LessonFacts[] = [
  { key: "slope", teaches: ["slope"], requires: [], ready: true },
  {
    key: "derivative",
    teaches: ["derivative"],
    requires: ["slope"],
    ready: true,
  },
  {
    key: "rules",
    teaches: ["power-rule"],
    requires: ["derivative"],
    ready: true,
  },
  {
    key: "motion",
    teaches: ["velocity"],
    requires: ["derivative", "vectors"],
    ready: true,
  },
];

const learner = (
  mastery: Record<string, number> = {},
  completed: string[] = [],
): LearnerState => ({ mastery, completedLessons: new Set(completed) });

describe("gaps", () => {
  it("lists concepts below practicing, including ones never attempted", () => {
    const state = learner({ slope: 0.9, derivative: 0.2, limit: 0.3 });
    expect(gaps(state, ["slope", "derivative", "limit", "vectors"])).toEqual([
      "derivative",
      "vectors",
    ]);
  });
});

describe("nextStep", () => {
  it("starts a new learner on the first lesson", () => {
    expect(nextStep(lessons, learner())).toEqual({
      kind: "lesson",
      lessonKey: "slope",
      gaps: [],
    });
  });

  it("moves to the next lesson once its prerequisites are being practised", () => {
    expect(nextStep(lessons, learner({ slope: 0.5 }, ["slope"]))).toEqual({
      kind: "lesson",
      lessonKey: "derivative",
      gaps: [],
    });
  });

  it("sends the learner back when a prerequisite is weak and a lesson can fix it", () => {
    // They finished "slope" and "derivative" but the derivative did not stick.
    const state = learner({ slope: 0.6, derivative: 0.1 }, ["slope"]);
    // "derivative" is the next unfinished lesson and its own requirement is met.
    expect(nextStep(lessons, state)).toMatchObject({
      kind: "lesson",
      lessonKey: "derivative",
    });

    // Skipped ahead: "rules" is next in line but needs the derivative.
    const skipped: LessonFacts[] = [
      {
        key: "rules",
        teaches: ["power-rule"],
        requires: ["derivative"],
        ready: true,
      },
      { key: "derivative", teaches: ["derivative"], requires: [], ready: true },
    ];
    expect(nextStep(skipped, learner())).toEqual({
      kind: "prerequisite",
      lessonKey: "derivative",
      conceptId: "derivative",
      forLesson: "rules",
    });
  });

  it("does not block on a gap that no written lesson can fill", () => {
    const state = learner({ slope: 0.9, derivative: 0.9 }, [
      "slope",
      "derivative",
      "rules",
    ]);
    expect(nextStep(lessons, state)).toEqual({
      kind: "lesson",
      lessonKey: "motion",
      gaps: ["vectors"],
    });
  });

  it("does not send the learner to a lesson that is not written, or already finished", () => {
    const course: LessonFacts[] = [
      { key: "limits", teaches: ["limit"], requires: [], ready: false },
      {
        key: "derivative",
        teaches: ["derivative"],
        requires: ["limit", "slope"],
        ready: true,
      },
      { key: "slope", teaches: ["slope"], requires: [], ready: true },
    ];
    // "limit" has no written lesson; "slope" was finished but did not stick.
    const state = learner({ slope: 0.1 }, ["slope"]);
    expect(nextStep(course, state)).toEqual({
      kind: "lesson",
      lessonKey: "derivative",
      gaps: ["limit", "slope"],
    });
  });

  it("skips lessons that are not written yet", () => {
    const course: LessonFacts[] = [
      { key: "a", teaches: ["a"], requires: [], ready: false },
      { key: "b", teaches: ["b"], requires: [], ready: true },
    ];
    expect(nextStep(course, learner())).toMatchObject({ lessonKey: "b" });
  });

  it("says done when every written lesson is finished", () => {
    expect(
      nextStep(
        lessons,
        learner({}, ["slope", "derivative", "rules", "motion"]),
      ),
    ).toEqual({ kind: "done" });
    expect(nextStep([], learner())).toEqual({ kind: "done" });
  });
});

describe("readiness", () => {
  it("is the share of needed concepts being practised", () => {
    const state = learner({ slope: 0.5, derivative: 0.9, velocity: 0.1 });
    expect(
      readiness(state, ["slope", "derivative", "velocity", "drag"]),
    ).toEqual({
      fraction: 0.5,
      toLearn: ["velocity", "drag"],
    });
  });

  it("counts a repeated concept once, and nothing needed means ready", () => {
    expect(
      readiness(learner({ slope: 0.5 }), ["slope", "slope"]).fraction,
    ).toBe(1);
    expect(readiness(learner(), [])).toEqual({ fraction: 1, toLearn: [] });
  });
});

describe("frontier", () => {
  const concepts = [
    { id: "slope", prerequisites: [] },
    { id: "limit", prerequisites: [] },
    { id: "derivative", prerequisites: ["slope", "limit"] },
    { id: "power-rule", prerequisites: ["derivative"] },
  ];

  it("starts with the concepts that need nothing", () => {
    expect(frontier(concepts, learner())).toEqual(["slope", "limit"]);
  });

  it("opens up a concept only when all its prerequisites are being practised", () => {
    expect(frontier(concepts, learner({ slope: 0.5 }))).toEqual(["limit"]);
    expect(frontier(concepts, learner({ slope: 0.5, limit: 0.4 }))).toEqual([
      "derivative",
    ]);
  });

  it("leaves out what the learner already knows", () => {
    const state = learner({
      slope: 0.9,
      limit: 0.9,
      derivative: 0.9,
      "power-rule": 0.5,
    });
    expect(frontier(concepts, state)).toEqual([]);
  });
});
