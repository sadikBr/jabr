import { describe, expect, it } from "vitest";

import { inOrder } from "./order";
import type { ContentBundle } from "./types";

const bundle = (parts: Partial<Record<keyof ContentBundle, unknown[]>>) =>
  ({
    concepts: [],
    courses: [],
    lessons: [],
    explainers: [],
    projects: [],
    milestones: [],
    questions: [],
    ...parts,
  }) as unknown as ContentBundle;

describe("inOrder", () => {
  it("puts courses in their stated order, whatever order they were read in", () => {
    const courses = [
      { id: "mechanics", order: 2 },
      { id: "python", order: 3 },
      { id: "calculus", order: 1 },
    ];
    for (const shuffled of [courses, [...courses].reverse()]) {
      expect(
        inOrder(bundle({ courses: shuffled })).courses.map((c) => c.id),
      ).toEqual(["calculus", "mechanics", "python"]);
    }
  });

  it("groups concepts by subject and keeps their written order within one", () => {
    const concepts = [
      { id: "velocity", subject: "physics" },
      { id: "force", subject: "physics" },
      { id: "functions", subject: "maths" },
      { id: "average-rate", subject: "maths" },
    ];
    expect(inOrder(bundle({ concepts })).concepts.map((c) => c.id)).toEqual([
      "functions",
      "average-rate",
      "velocity",
      "force",
    ]);
  });

  it("sorts everything else by id or key", () => {
    const sorted = inOrder(
      bundle({
        explainers: [{ id: "b" }, { id: "a" }],
        questions: [{ id: "q.2" }, { id: "q.1" }],
        lessons: [{ key: "c/m/z" }, { key: "c/m/a" }],
      }),
    );
    expect(sorted.explainers.map((e) => e.id)).toEqual(["a", "b"]);
    expect(sorted.questions.map((q) => q.id)).toEqual(["q.1", "q.2"]);
    expect(sorted.lessons.map((l) => l.key)).toEqual(["c/m/a", "c/m/z"]);
  });

  it("does not change the bundle it is given", () => {
    const courses = [
      { id: "b", order: 2 },
      { id: "a", order: 1 },
    ];
    inOrder(bundle({ courses }));
    expect(courses.map((c) => c.id)).toEqual(["b", "a"]);
  });
});
