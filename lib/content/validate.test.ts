import { describe, expect, it } from "vitest";

import type { MdxRefs } from "./mdx-refs";
import type {
  Concept,
  ContentBundle,
  Explainer,
  Lesson,
  Milestone,
  ParametrisedQuestion,
  Question,
} from "./types";
import { collectIds, type IssueCode, validateContent } from "./validate";

const emptyRefs: MdxRefs = {
  components: [],
  steps: [],
  layers: [],
  interactives: [],
  questions: [],
  codeLabs: [],
  connections: [],
};

const fullSteps: MdxRefs["steps"] = [
  { kind: "see", title: "See it" },
  { kind: "do", title: "Do it" },
  { kind: "check", title: "Check it" },
  { kind: "connect", title: "Connect it" },
];

function concept(id: string, prerequisites: string[] = []): Concept {
  return { id, title: id, subject: "maths", summary: id, prerequisites };
}

function lesson(
  id: string,
  overrides: Omit<Partial<Lesson>, "refs"> & { refs?: Partial<MdxRefs> } = {},
): Lesson {
  const { refs, ...rest } = overrides;
  return {
    id,
    key: `calc/m1/${id}`,
    course: "calc",
    module: "m1",
    title: id,
    summary: id,
    teaches: ["slope"],
    requires: [],
    status: "ready",
    body: "",
    ...rest,
    refs: { ...emptyRefs, steps: fullSteps, ...refs },
  };
}

function explainer(id: string, overrides: Partial<Explainer> = {}): Explainer {
  return {
    id,
    title: id,
    summary: id,
    subject: "physics",
    concepts: ["slope"],
    related: [],
    status: "ready",
    body: "",
    refs: {
      ...emptyRefs,
      layers: ["intuition", "mechanism"],
      interactives: [{ id: "tangent-zoom", props: {} }],
    },
    ...overrides,
  };
}

const numericQuestion: Question = {
  id: "q.numeric",
  type: "numeric",
  concepts: ["slope"],
  prompt: "2 + 2?",
  answer: 4,
  tolerance: { absolute: 0 },
  commonMistakes: [],
  hints: ["Count."],
};

/** A small, fully valid bundle. Tests break one thing at a time. */
function validBundle(): ContentBundle {
  return {
    concepts: [concept("slope"), concept("derivative", ["slope"])],
    courses: [
      {
        id: "calc",
        title: "Calculus",
        subject: "maths",
        level: "university-year-1",
        summary: "",
        status: "ready",
        modules: [
          { id: "m1", title: "M1", summary: "", lessons: ["intro", "next"] },
        ],
      },
    ],
    lessons: [
      lesson("intro", { refs: { questions: ["q.numeric"] } }),
      lesson("next", {
        teaches: ["derivative"],
        requires: ["slope"],
        refs: { interactives: [{ id: "tangent-zoom", props: {} }] },
      }),
    ],
    explainers: [explainer("why")],
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
    questions: [structuredClone(numericQuestion)],
  };
}

function codes(content: ContentBundle, level?: "error" | "warning") {
  return validateContent(content)
    .filter((issue) => !level || issue.level === level)
    .map((issue) => issue.code);
}

/** Applies `change` to a valid bundle and returns the issue with `code`. */
function issueAfter(code: IssueCode, change: (content: ContentBundle) => void) {
  const content = validBundle();
  change(content);
  return validateContent(content).find((issue) => issue.code === code);
}

describe("validateContent", () => {
  it("accepts a valid bundle", () => {
    expect(validateContent(validBundle())).toEqual([]);
  });

  describe("duplicate ids", () => {
    it.each([
      ["concept", (c: ContentBundle) => c.concepts.push(concept("slope"))],
      ["question", (c: ContentBundle) => c.questions.push(numericQuestion)],
      ["explainer", (c: ContentBundle) => c.explainers.push(explainer("why"))],
      ["project", (c: ContentBundle) => c.projects.push(c.projects[0]!)],
      ["course", (c: ContentBundle) => c.courses.push(c.courses[0]!)],
    ])("rejects a duplicate %s id", (kind, change) => {
      const issue = issueAfter("duplicate-id", change);
      expect(issue).toMatchObject({ level: "error" });
      expect(issue?.message).toContain(kind);
    });
  });

  describe("missing references", () => {
    it("rejects a prerequisite that does not exist", () => {
      expect(
        issueAfter("missing-concept", (c) =>
          c.concepts.push(concept("limit", ["ghost"])),
        ),
      ).toMatchObject({ level: "error", source: "concept limit" });
    });

    it("rejects unknown concepts in a lesson's teaches and requires", () => {
      expect(
        issueAfter("missing-concept", (c) => {
          c.lessons[0]!.teaches = ["ghost"];
        })?.message,
      ).toContain('"teaches"');
      expect(
        issueAfter("missing-concept", (c) => {
          c.lessons[0]!.requires = ["ghost"];
        })?.message,
      ).toContain('"requires"');
    });

    it("rejects a question id that does not exist", () => {
      expect(
        issueAfter("missing-question", (c) => {
          c.lessons[0]!.refs.questions = ["q.ghost"];
        }),
      ).toMatchObject({ level: "error", source: "lesson calc/m1/intro" });
    });

    it("rejects an interactive that is not in the registry", () => {
      expect(
        issueAfter("missing-interactive", (c) => {
          c.lessons[0]!.refs.interactives = [{ id: "ghost-sim", props: {} }];
        }),
      ).toMatchObject({ level: "error" });
    });

    it("rejects invalid interactive props", () => {
      const issue = issueAfter("invalid-interactive-props", (c) => {
        c.lessons[0]!.refs.interactives = [
          { id: "tangent-zoom", props: { fn: "x^2", x0: "one" } },
        ];
      });
      expect(issue?.message).toContain("x0");
      expect(
        issueAfter("invalid-interactive-props", (c) => {
          c.lessons[0]!.refs.interactives = [
            { id: "tangent-zoom", props: { fn: "x^2", speed: 3 } },
          ];
        }),
      ).toBeDefined();
    });

    it("accepts valid interactive props", () => {
      expect(
        issueAfter("invalid-interactive-props", (c) => {
          c.lessons[0]!.refs.interactives = [
            { id: "tangent-zoom", props: { fn: "x^2", x0: 1 } },
          ];
        }),
      ).toBeUndefined();
    });

    it("rejects unknown explainers and projects in ConnectIt", () => {
      const change = (c: ContentBundle) => {
        c.lessons[0]!.refs.connections = [
          { concepts: ["ghost"], explainers: ["nope"], projects: ["nada"] },
        ];
      };
      expect(issueAfter("missing-concept", change)).toBeDefined();
      expect(issueAfter("missing-explainer", change)).toBeDefined();
      expect(issueAfter("missing-project", change)).toBeDefined();
    });

    it("rejects a missing capstone or module project", () => {
      expect(
        issueAfter("missing-project", (c) => {
          c.courses[0]!.capstone = "ghost";
        }),
      ).toBeDefined();
      expect(
        issueAfter("missing-project", (c) => {
          c.courses[0]!.modules[0]!.project = "ghost";
        }),
      ).toBeDefined();
    });

    it("rejects a lesson listed in a course without a file", () => {
      expect(
        issueAfter("missing-lesson", (c) => {
          c.courses[0]!.modules[0]!.lessons.push("ghost");
        })?.message,
      ).toContain("calc/m1/ghost.mdx");
    });

    it("rejects a lesson file that no course lists", () => {
      expect(
        issueAfter("lesson-not-in-course", (c) => {
          c.lessons.push(lesson("orphan"));
        }),
      ).toMatchObject({ level: "error", source: "lesson calc/m1/orphan" });
    });

    it("rejects a canonical lesson that is missing or teaches something else", () => {
      expect(
        issueAfter("missing-lesson", (c) => {
          c.concepts[0]!.lesson = "calc/m1/ghost";
        }),
      ).toBeDefined();
      expect(
        issueAfter("canonical-lesson-mismatch", (c) => {
          c.concepts[0]!.lesson = "calc/m1/next";
        }),
      ).toBeDefined();
    });

    it("rejects unknown related explainers and explainer concepts", () => {
      expect(
        issueAfter("missing-explainer", (c) => {
          c.explainers[0]!.related = ["ghost"];
        }),
      ).toBeDefined();
      expect(
        issueAfter("missing-concept", (c) => {
          c.explainers[0]!.concepts = ["ghost"];
        }),
      ).toBeDefined();
    });

    it("rejects components that do not exist", () => {
      expect(
        issueAfter("unknown-component", (c) => {
          c.lessons[0]!.refs.components = ["Step", "Sparkles"];
        })?.message,
      ).toContain("<Sparkles>");
    });
  });

  describe("prerequisite graph", () => {
    it("rejects a cycle and names its path", () => {
      const issue = issueAfter("prerequisite-cycle", (c) => {
        c.concepts[0]!.prerequisites = ["derivative"];
      });
      expect(issue).toMatchObject({ level: "error" });
      expect(issue?.message).toContain("slope → derivative → slope");
    });

    it("rejects a concept that requires itself", () => {
      expect(
        issueAfter("prerequisite-cycle", (c) => {
          c.concepts[0]!.prerequisites = ["slope"];
        }),
      ).toBeDefined();
    });
  });

  describe("lesson order", () => {
    it("warns when a lesson requires a concept taught later in the course", () => {
      const issue = issueAfter("requires-taught-later", (c) => {
        c.lessons[0]!.requires = ["derivative"];
      });
      expect(issue).toMatchObject({
        level: "warning",
        source: "lesson calc/m1/intro",
      });
    });

    it("does not warn when the concept was taught earlier", () => {
      expect(codes(validBundle())).not.toContain("requires-taught-later");
    });
  });

  describe("lesson and explainer structure", () => {
    it("rejects a ready lesson that skips part of the rhythm", () => {
      expect(
        issueAfter("invalid-steps", (c) => {
          c.lessons[0]!.refs.steps = fullSteps.slice(0, 3);
        }),
      ).toBeDefined();
    });

    it("rejects steps that are out of order or have an unknown kind", () => {
      expect(
        issueAfter("invalid-steps", (c) => {
          c.lessons[0]!.refs.steps = [...fullSteps].reverse();
        }),
      ).toBeDefined();
      expect(
        issueAfter("invalid-steps", (c) => {
          c.lessons[0]!.refs.steps = [
            ...fullSteps,
            { kind: "party", title: "Party" },
          ];
        }),
      ).toBeDefined();
    });

    it("rejects duplicate step titles", () => {
      expect(
        issueAfter("invalid-steps", (c) => {
          c.lessons[0]!.refs.steps = fullSteps.map((step) => ({
            ...step,
            title: "Same",
          }));
        }),
      ).toBeDefined();
    });

    it("does not check the structure of coming-soon lessons", () => {
      expect(
        issueAfter("invalid-steps", (c) => {
          c.lessons[1]!.status = "coming-soon";
          c.lessons[1]!.refs.steps = [];
        }),
      ).toBeUndefined();
    });

    it("rejects explainer layers that are missing, repeated or out of order", () => {
      for (const layers of [
        [],
        ["mechanism"],
        ["intuition", "intuition"],
        ["intuition", "maths", "mechanism"],
        ["intuition", "deep"],
      ]) {
        expect(
          issueAfter("invalid-layers", (c) => {
            c.explainers[0]!.refs.layers = layers;
          }),
          layers.join(","),
        ).toBeDefined();
      }
    });
  });

  describe("questions", () => {
    it("rejects a question with no concepts", () => {
      expect(
        issueAfter("question-without-concepts", (c) => {
          c.questions[0]!.concepts = [];
        }),
      ).toMatchObject({ level: "error" });
    });

    it("rejects a non-trivial question with no hints", () => {
      expect(
        issueAfter("question-missing-hints", (c) => {
          c.questions[0]!.hints = [];
        }),
      ).toMatchObject({ level: "error" });
    });

    it("does not demand hints for multiple-choice or self-check questions", () => {
      expect(
        issueAfter("question-missing-hints", (c) => {
          c.questions = [
            {
              id: "q.numeric",
              type: "multiple-choice",
              multiple: false,
              concepts: ["slope"],
              prompt: "?",
              hints: [],
              choices: [
                { id: "a", text: "a", correct: true },
                { id: "b", text: "b", correct: false },
              ],
            },
          ];
        }),
      ).toBeUndefined();
    });

    it("rejects multiple-choice questions with no or too many correct choices", () => {
      const withChoices = (correct: boolean[], multiple = false) =>
        issueAfter("question-invalid-choices", (c) => {
          c.questions = [
            {
              id: "q.numeric",
              type: "multiple-choice",
              multiple,
              concepts: ["slope"],
              prompt: "?",
              hints: [],
              choices: correct.map((isCorrect, i) => ({
                id: `c${i}`,
                text: `c${i}`,
                correct: isCorrect,
              })),
            },
          ];
        });
      expect(withChoices([false, false])).toBeDefined();
      expect(withChoices([true, true])).toBeDefined();
      expect(withChoices([true, true], true)).toBeUndefined();
      expect(withChoices([true, false])).toBeUndefined();
    });

    const parametrised = (answer: string): Question => ({
      id: "q.numeric",
      type: "parametrised",
      concepts: ["slope"],
      prompt: "{a}?",
      hints: ["Think."],
      params: { a: { min: 0, max: 2, step: 1 } },
      derived: {},
      answer,
      tolerance: { relative: 0.01 },
      commonMistakes: [],
    });

    it("rejects a derived value that fails for some parameters", () => {
      const issue = issueAfter("parametrised-answer-error", (c) => {
        c.questions = [
          {
            ...(parametrised("a + inverse") as ParametrisedQuestion),
            derived: { inverse: "1 / (a - 1)" },
          },
        ];
      });
      expect(issue).toBeDefined();
    });

    it("lets the answer use derived values", () => {
      const issue = issueAfter("parametrised-answer-error", (c) => {
        c.questions = [
          {
            ...(parametrised("double + 1") as ParametrisedQuestion),
            derived: { double: "2 * a" },
          },
        ];
      });
      expect(issue).toBeUndefined();
    });

    it("rejects a parametrised answer that fails for some parameters", () => {
      // Division by zero when a = 1.
      const issue = issueAfter("parametrised-answer-error", (c) => {
        c.questions = [parametrised("1 / (a - 1)")];
      });
      expect(issue).toMatchObject({ level: "error" });
      expect(issue?.message).toContain('{"a":1}');
    });

    it("rejects a parametrised answer that is not a valid formula", () => {
      expect(
        issueAfter("parametrised-answer-error", (c) => {
          c.questions = [parametrised("2 * b")];
        }),
      ).toBeDefined();
    });

    it("accepts a parametrised answer that works for every parameter", () => {
      expect(
        issueAfter("parametrised-answer-error", (c) => {
          c.questions = [parametrised("sin(a deg) + a^2")];
        }),
      ).toBeUndefined();
    });

    it("rejects a common mistake whose formula fails", () => {
      const issue = issueAfter("parametrised-answer-error", (c) => {
        c.questions = [
          {
            ...parametrised("2 * a"),
            commonMistakes: [{ answer: "a / zzz", feedback: "No." }],
          } as Question,
        ];
      });
      expect(issue?.message).toContain("common mistake");
    });

    const codeQuestion = (tests?: string): Question => ({
      id: "q.numeric",
      type: "code",
      concepts: ["slope"],
      prompt: "Code it",
      hints: tests ? ["Try a loop."] : [],
      starter: "x = 1",
      tests,
    });

    it("accepts a code playground with no tests and no hints", () => {
      const content = validBundle();
      content.questions = [codeQuestion()];
      expect(validateContent(content)).toEqual([]);
    });

    it("rejects code tests that define no test functions", () => {
      expect(
        issueAfter("code-without-tests", (c) => {
          c.questions = [codeQuestion("assert x == 1")];
        }),
      ).toMatchObject({ level: "error" });
      expect(
        issueAfter("code-without-tests", (c) => {
          c.questions = [codeQuestion("def test_x():\n    assert x == 1")];
        }),
      ).toBeUndefined();
    });

    it("rejects <CodeLab> pointing at a question that is not code", () => {
      expect(
        issueAfter("codelab-not-code", (c) => {
          c.lessons[0]!.refs.codeLabs = ["q.numeric"];
        }),
      ).toMatchObject({ level: "error" });
    });

    it("warns about questions no lesson uses", () => {
      expect(
        issueAfter("question-unused", (c) => {
          c.lessons[0]!.refs.questions = [];
        }),
      ).toMatchObject({ level: "warning" });
    });
  });

  describe("projects and milestones", () => {
    const codeLab: Question = {
      id: "q.lab",
      type: "code",
      concepts: ["slope"],
      prompt: "Code it",
      hints: ["Try a loop."],
      starter: "x = 1",
      tests: "def test_x():\n    assert x == 2",
    };
    const milestone = (
      id: string,
      overrides: Partial<Milestone> = {},
    ): Milestone => ({
      id,
      key: `rocket/${id}`,
      project: "rocket",
      title: id,
      summary: id,
      requires: ["slope"],
      check: "q.lab",
      body: "",
      refs: emptyRefs,
      ...overrides,
    });
    /** The valid bundle with the rocket project made ready, with one milestone. */
    function withProject(change?: (content: ContentBundle) => void) {
      const content = validBundle();
      content.projects[0] = {
        ...content.projects[0]!,
        status: "ready",
        milestones: ["first"],
      };
      content.milestones = [milestone("first")];
      content.questions.push(codeLab);
      change?.(content);
      return validateContent(content);
    }
    const find = (
      issues: ReturnType<typeof validateContent>,
      code: IssueCode,
    ) => issues.find((issue) => issue.code === code);

    it("accepts a ready project whose milestone is checked by a code lab", () => {
      expect(withProject()).toEqual([]);
    });

    it("rejects a ready project with no milestones", () => {
      const issues = withProject((c) => {
        c.projects[0]!.milestones = [];
        c.milestones = [];
        c.questions.pop();
      });
      expect(find(issues, "project-without-milestones")).toMatchObject({
        level: "error",
      });
    });

    it("rejects a milestone listed without a file, and a file that is not listed", () => {
      expect(
        find(
          withProject((c) => c.projects[0]!.milestones.push("ghost")),
          "missing-milestone",
        )?.message,
      ).toContain("milestones/ghost.mdx");
      expect(
        find(
          withProject((c) => c.milestones.push(milestone("orphan"))),
          "milestone-not-in-project",
        ),
      ).toMatchObject({ source: "milestone rocket/orphan" });
    });

    it("rejects a milestone listed twice", () => {
      expect(
        find(
          withProject((c) => c.projects[0]!.milestones.push("first")),
          "duplicate-id",
        ),
      ).toBeDefined();
    });

    it("rejects a check that is missing, not code, or has no tests", () => {
      expect(
        find(
          withProject((c) => {
            c.milestones[0]!.check = "q.ghost";
          }),
          "invalid-milestone-check",
        )?.message,
      ).toContain("is not a question");
      expect(
        find(
          withProject((c) => {
            c.milestones[0]!.check = "q.numeric";
          }),
          "invalid-milestone-check",
        )?.message,
      ).toContain("code question with tests");
      expect(
        find(
          withProject((c) => {
            (c.questions.at(-1) as { tests?: string }).tests = undefined;
            c.questions.at(-1)!.hints = [];
          }),
          "invalid-milestone-check",
        ),
      ).toBeDefined();
    });

    it("rejects unknown concepts and components in a milestone", () => {
      expect(
        find(
          withProject((c) => {
            c.milestones[0]!.requires = ["ghost"];
          }),
          "missing-concept",
        ),
      ).toBeDefined();
      expect(
        find(
          withProject((c) => {
            c.milestones[0]!.refs = { ...emptyRefs, components: ["Sparkles"] };
          }),
          "unknown-component",
        ),
      ).toBeDefined();
    });

    it("counts a milestone's check as a use of that question", () => {
      expect(find(withProject(), "question-unused")).toBeUndefined();
    });

    it("warns when a milestone id recorded before has gone", () => {
      const before = collectIds({
        ...validBundle(),
        milestones: [milestone("first")],
      });
      expect(validateContent(validBundle(), before)).toEqual([
        expect.objectContaining({
          code: "removed-id",
          source: "milestones rocket/first",
        }),
      ]);
    });
  });

  describe("learning by doing", () => {
    it("warns when a lesson has nothing to manipulate", () => {
      const content = validBundle();
      expect(codes(content)).not.toContain("nothing-to-do");
      content.lessons[0]!.refs.questions = [];
      content.questions = [];
      expect(
        validateContent(content).find((i) => i.code === "nothing-to-do"),
      ).toMatchObject({ level: "warning", source: "lesson calc/m1/intro" });
    });

    it("warns when an explainer is reading only", () => {
      expect(
        issueAfter("nothing-to-do", (c) => {
          c.explainers[0]!.refs.interactives = [];
        }),
      ).toMatchObject({ level: "warning", source: "explainer why" });
    });
  });

  describe("coverage", () => {
    it("warns about concepts that no lesson teaches", () => {
      expect(
        issueAfter("concept-never-taught", (c) => {
          c.concepts.push(concept("limit"));
        }),
      ).toMatchObject({ level: "warning", source: "concept limit" });
    });
  });

  describe("removed ids", () => {
    it("warns when an id recorded in the lock has gone", () => {
      const before = collectIds(validBundle());
      const content = validBundle();
      content.questions = [];
      content.lessons[0]!.refs.questions = [];
      content.lessons[0]!.refs.interactives = [
        { id: "tangent-zoom", props: {} },
      ];
      const issues = validateContent(content, before);
      expect(issues).toEqual([
        expect.objectContaining({
          level: "warning",
          code: "removed-id",
          source: "questions q.numeric",
        }),
      ]);
    });

    it("says nothing when ids are only added", () => {
      const before = collectIds(validBundle());
      const content = validBundle();
      content.concepts.push(concept("limit", ["slope"]));
      content.lessons[1]!.teaches.push("limit");
      expect(validateContent(content, before)).toEqual([]);
    });
  });
});
