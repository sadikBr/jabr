import { describe, expect, it } from "vitest";

import {
  conceptUsage,
  courseLessons,
  courseStats,
  getConcepts,
  lessonNeighbours,
} from "./queries";
import type { ContentBundle, Lesson } from "./types";

const refs = {
  components: [],
  steps: [],
  layers: [],
  interactives: [],
  questions: [],
  codeLabs: [],
  connections: [],
};

function lesson(
  module: string,
  id: string,
  overrides: Partial<Lesson> = {},
): Lesson {
  return {
    id,
    key: `calc/${module}/${id}`,
    course: "calc",
    module,
    title: id,
    summary: "",
    teaches: [],
    requires: [],
    status: "ready",
    body: "",
    refs,
    ...overrides,
  };
}

const content: ContentBundle = {
  concepts: [
    {
      id: "slope",
      title: "Slope",
      subject: "maths",
      summary: "",
      prerequisites: [],
    },
    {
      id: "derivative",
      title: "Derivative",
      subject: "maths",
      summary: "",
      prerequisites: ["slope"],
    },
  ],
  courses: [
    {
      id: "calc",
      title: "Calculus",
      subject: "maths",
      level: "university-year-1",
      summary: "",
      status: "ready",
      modules: [
        { id: "m1", title: "One", summary: "", lessons: ["a", "b"] },
        { id: "m2", title: "Two", summary: "", lessons: ["c", "d"] },
      ],
    },
  ],
  // Deliberately out of order: course.yaml decides the order, not the files.
  lessons: [
    lesson("m2", "d", { requires: ["derivative"] }),
    lesson("m2", "c", { status: "coming-soon", teaches: ["derivative"] }),
    lesson("m1", "b", { teaches: ["slope"], estimatedMinutes: 10 }),
    lesson("m1", "a", { estimatedMinutes: 5 }),
  ],
  explainers: [
    {
      id: "why",
      title: "Why?",
      summary: "",
      subject: "physics",
      concepts: ["derivative"],
      related: [],
      status: "ready",
      body: "",
      refs,
    },
  ],
  projects: [
    {
      id: "rocket",
      title: "Rocket",
      summary: "",
      subjects: ["physics"],
      kind: "capstone",
      concepts: ["derivative"],
      milestones: [],
      status: "coming-soon",
    },
  ],
  milestones: [],
  questions: [],
};
const course = content.courses[0]!;

describe("courseLessons", () => {
  it("returns lessons in course order with their module", () => {
    expect(
      courseLessons(content, course).map(
        (e) => `${e.module.id}/${e.lesson.id}`,
      ),
    ).toEqual(["m1/a", "m1/b", "m2/c", "m2/d"]);
  });
});

describe("lessonNeighbours", () => {
  it("skips lessons that are not written yet", () => {
    const b = content.lessons.find((l) => l.id === "b")!;
    const { previous, next } = lessonNeighbours(content, b);
    expect(previous?.id).toBe("a");
    expect(next?.id).toBe("d");
  });

  it("has no previous at the start and no next at the end", () => {
    const a = content.lessons.find((l) => l.id === "a")!;
    const d = content.lessons.find((l) => l.id === "d")!;
    expect(lessonNeighbours(content, a).previous).toBeUndefined();
    expect(lessonNeighbours(content, d).next).toBeUndefined();
  });
});

describe("conceptUsage", () => {
  it("finds everywhere a concept appears", () => {
    const usage = conceptUsage(content, "derivative");
    expect(usage.taughtIn.map((l) => l.id)).toEqual(["c"]);
    expect(usage.usedInLessons.map((l) => l.id)).toEqual(["d"]);
    expect(usage.explainers.map((e) => e.id)).toEqual(["why"]);
    expect(usage.projects.map((p) => p.id)).toEqual(["rocket"]);
    expect(
      conceptUsage(content, "slope").buildsToward.map((c) => c.id),
    ).toEqual(["derivative"]);
  });
});

describe("courseStats", () => {
  it("counts lessons, ready lessons, minutes and concepts", () => {
    expect(courseStats(content, course)).toEqual({
      lessons: 4,
      readyLessons: 3,
      minutes: 15,
      concepts: 2,
    });
  });
});

describe("getConcepts", () => {
  it("keeps order and drops unknown ids", () => {
    expect(
      getConcepts(content, ["derivative", "ghost", "slope"]).map((c) => c.id),
    ).toEqual(["derivative", "slope"]);
  });
});
