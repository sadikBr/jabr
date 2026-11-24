import { describe, expect, it } from "vitest";

import { evaluateAnswer } from "@/lib/content/parametrised";
import { content } from "@/lib/content/source";
import type { Question } from "@/lib/content/types";
import type { QuestionResponse } from "@/lib/grading/grade";
import { defaultSeed, pickParams } from "@/lib/grading/params";

import { checkAnswer, getQuestionVariant, revealSolution } from "./actions";

// These run the real server functions against the real content.

/** The response a learner who knows the answer would give. */
function correctResponse(
  question: Question,
  seed: number,
): QuestionResponse | null {
  switch (question.type) {
    case "multiple-choice":
      return {
        type: "choices",
        selected: question.choices.filter((c) => c.correct).map((c) => c.id),
      };
    case "numeric":
      return { type: "text", value: String(question.answer) };
    case "parametrised":
      return {
        type: "text",
        value: String(
          evaluateAnswer(question.answer, pickParams(question.params, seed)),
        ),
      };
    case "expression":
      return { type: "text", value: question.answer };
    case "self-check":
      return { type: "self-check", met: question.rubric.map((_, i) => i) };
    case "code":
      return null; // graded from test results; covered by verify-code
  }
}

describe("checkAnswer", () => {
  const gradable = content.questions.filter((q) => q.type !== "code");

  it.each(gradable.map((q) => [q.id, q] as const))(
    "accepts the right answer to %s",
    async (_id, question) => {
      for (const seed of [defaultSeed(question.id), 1, 999, 123456789]) {
        const result = await checkAnswer({
          questionId: question.id,
          seed,
          response: correctResponse(question, seed),
        });
        expect(result, `seed ${seed}`).toMatchObject({
          status: "graded",
          correct: true,
          invalid: false,
        });
      }
    },
  );

  it("returns the solution only with a correct answer", async () => {
    const right = await checkAnswer({
      questionId: "calc.deriv.shrinking-h",
      seed: 1,
      response: { type: "choices", selected: ["two"] },
    });
    expect(right).toMatchObject({ correct: true });
    expect(JSON.stringify(right)).toContain("correctChoiceIds");

    const wrong = await checkAnswer({
      questionId: "calc.deriv.shrinking-h",
      seed: 1,
      response: { type: "choices", selected: ["three"] },
    });
    expect(wrong).toMatchObject({ correct: false });
    expect(wrong).not.toHaveProperty("solution.correctChoiceIds");
    expect(JSON.stringify(wrong)).not.toContain("correctChoiceIds");
    // …but it does explain why that choice is wrong.
    expect(JSON.stringify(wrong)).toContain("whole unit");
  });

  it("gives targeted feedback for a known mistake, with this attempt's numbers", async () => {
    const seed = 77;
    const { h } = pickParams({ h: { min: 2, max: 10, step: 1 } }, seed);
    const onEarth = Math.sqrt((2 * h!) / 9.81);
    const result = await checkAnswer({
      questionId: "fall.moon-drop-time",
      seed,
      response: { type: "text", value: onEarth.toFixed(3) },
    });
    expect(result).toMatchObject({ correct: false });
    expect(JSON.stringify(result)).toContain("on Earth");
  });

  it.each([
    [
      "an unknown question",
      { questionId: "nope", seed: 1, response: { type: "text", value: "1" } },
    ],
    ["a missing response", { questionId: "calc.deriv.shrinking-h", seed: 1 }],
    [
      "a negative seed",
      {
        questionId: "calc.deriv.shrinking-h",
        seed: -1,
        response: { type: "text", value: "1" },
      },
    ],
    [
      "a huge answer",
      {
        questionId: "calc.deriv.slope-at-point",
        seed: 1,
        response: { type: "text", value: "9".repeat(5000) },
      },
    ],
    ["a string", "calc.deriv.shrinking-h"],
    ["nothing", undefined],
  ])("rejects %s", async (_label, input) => {
    expect(await checkAnswer(input)).toEqual({ status: "not-found" });
  });

  it("treats the wrong kind of response as unreadable, not as an attempt", async () => {
    expect(
      await checkAnswer({
        questionId: "calc.deriv.slope-at-point",
        seed: 1,
        response: { type: "choices", selected: ["two"] },
      }),
    ).toMatchObject({ status: "graded", correct: false, invalid: true });
  });
});

describe("getQuestionVariant", () => {
  it("returns different numbers for different seeds, and never the answer", async () => {
    const prompts = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const view = await getQuestionVariant({
        questionId: "calc.deriv.slope-at-point",
        seed,
      });
      prompts.add(view!.promptHtml);
      const json = JSON.stringify(view);
      expect(json).not.toContain("2 * a");
      expect(json).not.toContain("tolerance");
    }
    expect(prompts.size).toBeGreaterThan(3);
  });

  it("returns null for bad input", async () => {
    expect(
      await getQuestionVariant({ questionId: "nope", seed: 1 }),
    ).toBeNull();
    expect(
      await getQuestionVariant({ questionId: "calc.deriv.sign" }),
    ).toBeNull();
  });
});

describe("revealSolution", () => {
  it("gives the worked solution and the expected answer", async () => {
    const solution = await revealSolution({
      questionId: "calc.deriv.definition-expression",
      seed: 1,
    });
    expect(solution).toMatchObject({ answerText: "6x" });
    expect(solution?.solutionHtml).toContain("katex");
  });
});
