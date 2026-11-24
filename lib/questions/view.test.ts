import { describe, expect, it } from "vitest";

import type { Question } from "@/lib/content/types";
import { pickParams } from "@/lib/grading/params";

import { buildQuestionSolution, buildQuestionView } from "./view";

const base = { concepts: ["c"], hints: ["Think about $x$."] };

const parametrised: Question = {
  ...base,
  id: "q.param",
  type: "parametrised",
  params: { a: { min: 1, max: 9, step: 1 } },
  prompt: "What is $2 \\times {a}$?",
  answer: "2 * a",
  tolerance: { absolute: 0.001 },
  unit: "m",
  commonMistakes: [{ answer: "a", feedback: "SECRET-FEEDBACK" }],
  solution: "It is $2 \\times {a}$.",
};

const choice: Question = {
  ...base,
  id: "q.choice",
  type: "multiple-choice",
  multiple: false,
  prompt: "Pick one",
  choices: [
    { id: "right", text: "Yes", correct: true },
    { id: "wrong", text: "No", correct: false, feedback: "SECRET-FEEDBACK" },
  ],
  solution: "SECRET-SOLUTION",
};

describe("buildQuestionView", () => {
  it("fills the prompt and hints with the seed's values", () => {
    const { a } = pickParams(parametrised.params, 42);
    const view = buildQuestionView(parametrised, 42);
    expect(view.seed).toBe(42);
    expect(view.promptHtml).toContain(String(a));
    expect(view.promptHtml).not.toContain("{a}");
    expect(view.unit).toBe("m");
    expect(view.canVary).toBe(true);
  });

  it("never includes answers, tolerances, feedback or solutions", () => {
    for (const question of [parametrised, choice]) {
      const json = JSON.stringify(buildQuestionView(question, 7));
      expect(json).not.toContain("SECRET");
      expect(json).not.toContain("tolerance");
      expect(json).not.toContain("correct");
      expect(json).not.toContain("2 * a");
      expect(json).not.toContain("answer");
    }
  });

  it("lists choices without saying which is right", () => {
    expect(buildQuestionView(choice).choices).toEqual([
      { id: "right", html: "Yes" },
      { id: "wrong", html: "No" },
    ]);
  });

  it("exposes a code lab's starter and tests, which run in the browser", () => {
    const view = buildQuestionView({
      ...base,
      id: "q.code",
      type: "code",
      prompt: "Write it",
      starter: "x = 1",
      tests: "def test_x():\n    assert x == 2\n",
    });
    expect(view.code).toEqual({
      starter: "x = 1",
      tests: "def test_x():\n    assert x == 2\n",
      testNames: ["test_x"],
    });
  });
});

describe("buildQuestionSolution", () => {
  it("gives the expected value for the seed, with its unit", () => {
    const { a } = pickParams(parametrised.params, 42);
    const solution = buildQuestionSolution(parametrised, 42);
    expect(solution.answerText).toBe(`${2 * a!} m`);
    expect(solution.solutionHtml).toContain(String(a));
  });

  it("names the correct choices", () => {
    expect(buildQuestionSolution(choice).correctChoiceIds).toEqual(["right"]);
  });
});
