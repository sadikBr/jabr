import { describe, expect, it } from "vitest";

import type {
  CodeQuestion,
  ExpressionQuestion,
  MultipleChoiceQuestion,
  NumericQuestion,
  ParametrisedQuestion,
  SelfCheckQuestion,
} from "@/lib/content/types";

import { grade, testNames } from "./grade";
import { pickParams } from "./params";

const base = { concepts: ["c"], prompt: "?", hints: [] };
const text = (value: string) => ({ type: "text" as const, value });
const choices = (...selected: string[]) => ({
  type: "choices" as const,
  selected,
});

describe("multiple-choice", () => {
  const single: MultipleChoiceQuestion = {
    ...base,
    id: "q.single",
    type: "multiple-choice",
    multiple: false,
    choices: [
      { id: "a", text: "A", correct: true },
      { id: "b", text: "B", correct: false, feedback: "B is the height." },
      { id: "c", text: "C", correct: false },
    ],
  };
  const multi: MultipleChoiceQuestion = {
    ...base,
    id: "q.multi",
    type: "multiple-choice",
    multiple: true,
    choices: [
      { id: "a", text: "A", correct: true },
      { id: "b", text: "B", correct: true },
      { id: "c", text: "C", correct: false, feedback: "C says nothing here." },
      { id: "d", text: "D", correct: true },
    ],
  };

  it("marks the right choice correct", () => {
    expect(grade(single, choices("a"))).toEqual({ correct: true, score: 1 });
  });

  it("gives the wrong choice's own feedback", () => {
    expect(grade(single, choices("b"))).toEqual({
      correct: false,
      score: 0,
      feedback: { kind: "text", text: "B is the height." },
    });
    expect(grade(single, choices("c"))).toEqual({ correct: false, score: 0 });
  });

  it("needs exactly the right set when several can be selected", () => {
    expect(grade(multi, choices("a", "b", "d")).correct).toBe(true);
    expect(grade(multi, choices("d", "a", "b", "a")).correct).toBe(true);
  });

  it("gives partial credit and a nudge for an incomplete selection", () => {
    expect(grade(multi, choices("a", "b"))).toEqual({
      correct: false,
      score: 2 / 3,
      feedback: { kind: "code", code: "select-more" },
    });
  });

  it("takes credit away for wrong selections, never below zero", () => {
    expect(grade(multi, choices("a", "b", "c", "d"))).toMatchObject({
      correct: false,
      score: 2 / 3,
      feedback: { kind: "text", text: "C says nothing here." },
    });
    expect(grade(multi, choices("c")).score).toBe(0);
  });

  it("treats empty, unknown and over-full selections as invalid, not wrong", () => {
    expect(grade(single, choices())).toMatchObject({ invalid: true });
    expect(grade(single, choices("zzz"))).toMatchObject({ invalid: true });
    expect(grade(single, choices("a", "b"))).toMatchObject({ invalid: true });
    expect(grade(single, text("a"))).toMatchObject({ invalid: true });
  });
});

describe("numeric", () => {
  const question: NumericQuestion = {
    ...base,
    id: "q.numeric",
    type: "numeric",
    answer: 9.81,
    tolerance: { absolute: 0.01 },
    unit: "m/s²",
    commonMistakes: [{ answer: 4.905, feedback: "That is g/2." }],
  };

  it("accepts answers inside the tolerance, with or without the unit", () => {
    expect(grade(question, text("9.81")).correct).toBe(true);
    expect(grade(question, text("9.8")).correct).toBe(true);
    expect(grade(question, text("9.82 m/s²")).correct).toBe(true);
    expect(grade(question, text("9,81")).correct).toBe(true);
  });

  it("rejects answers just outside the tolerance", () => {
    expect(grade(question, text("9.79")).correct).toBe(false);
    expect(grade(question, text("9.83")).correct).toBe(false);
  });

  it("recognises mistakes listed in the content", () => {
    expect(grade(question, text("4.905")).feedback).toEqual({
      kind: "text",
      text: "That is g/2.",
    });
  });

  it("spots sign and power-of-ten slips", () => {
    expect(grade(question, text("-9.81")).feedback).toEqual({
      kind: "code",
      code: "sign-error",
    });
    expect(grade(question, text("981")).feedback).toEqual({
      kind: "code",
      code: "power-of-ten",
    });
  });

  it("asks for a number when it cannot read one, without counting it wrong", () => {
    expect(grade(question, text("fast"))).toMatchObject({
      invalid: true,
      feedback: { kind: "code", code: "input-unknown-symbol" },
    });
    expect(grade(question, text(""))).toMatchObject({
      invalid: true,
      feedback: { kind: "code", code: "input-empty" },
    });
  });
});

describe("parametrised", () => {
  const question: ParametrisedQuestion = {
    ...base,
    id: "mech.projectile.range-1",
    type: "parametrised",
    params: {
      v: { min: 10, max: 30, step: 1 },
      angle: { choices: [30, 45, 60] },
    },
    prompt: "A ball is launched at {v} m/s at {angle}°. How far does it land?",
    answer: "v^2 * sin(2 * angle deg) / 9.81",
    tolerance: { relative: 0.02 },
    unit: "m",
    commonMistakes: [
      {
        answer: "v^2 * sin(angle deg) / 9.81",
        feedback: "Use sin(2θ), not sin(θ).",
      },
    ],
  };
  const range = (v: number, angle: number) =>
    (v * v * Math.sin((2 * angle * Math.PI) / 180)) / 9.81;

  it("grades against the values chosen by the seed", () => {
    for (const seed of [1, 2, 3, 77, 123456]) {
      const { v, angle } = pickParams(question.params, seed);
      const answer = range(v!, angle!);
      expect(grade(question, text(answer.toFixed(2)), { seed }).correct).toBe(
        true,
      );
      expect(
        grade(question, text((answer * 1.019).toFixed(4)), { seed }).correct,
      ).toBe(true);
      expect(
        grade(question, text((answer * 1.03).toFixed(4)), { seed }).correct,
      ).toBe(false);
    }
  });

  it("uses a stable default seed when none is given", () => {
    const first = grade(question, text("1"));
    expect(grade(question, text("1"))).toEqual(first);
  });

  it("hints at radians mode when the answer matches degrees read as radians", () => {
    const seed = 5;
    const { v, angle } = pickParams(question.params, seed);
    const inRadians = (v! * v! * Math.sin(2 * angle!)) / 9.81;
    expect(grade(question, text(String(inRadians)), { seed }).feedback).toEqual(
      {
        kind: "code",
        code: "radians-mode",
      },
    );
  });

  it("recognises a mistake given as a formula of the parameters", () => {
    const seed = 8;
    const { v, angle } = pickParams(question.params, seed);
    // sin(θ) and sin(2θ) coincide in size only at special angles; skip those.
    const mistaken = (v! * v! * Math.sin((angle! * Math.PI) / 180)) / 9.81;
    const result = grade(question, text(String(mistaken)), { seed });
    if (angle !== 60) {
      expect(result.feedback).toEqual({
        kind: "text",
        text: "Use sin(2θ), not sin(θ).",
      });
    }
    expect(result.correct).toBe(angle === 60);
  });
});

describe("expression", () => {
  const question: ExpressionQuestion = {
    ...base,
    id: "q.expression",
    type: "expression",
    answer: "6x",
    variables: ["x"],
  };

  it.each(["6x", "6*x", "x*6", "3x + 3x", "6 x", "f'(x) = 6x", "12x/2", "6x¹"])(
    "accepts %s",
    (value) => {
      expect(grade(question, text(value))).toEqual({ correct: true, score: 1 });
    },
  );

  it.each(["6", "3x", "6x^2", "6x + 1", "-6x"])("rejects %s", (value) => {
    expect(grade(question, text(value))).toEqual({ correct: false, score: 0 });
  });

  it("explains unreadable input without counting it wrong", () => {
    expect(grade(question, text("6y"))).toMatchObject({
      invalid: true,
      feedback: { kind: "code", code: "input-unknown-symbol" },
    });
    expect(grade(question, text("6x +"))).toMatchObject({
      invalid: true,
      feedback: { kind: "code", code: "input-syntax" },
    });
  });
});

describe("self-check", () => {
  const question: SelfCheckQuestion = {
    ...base,
    id: "q.self",
    type: "self-check",
    rubric: ["one", "two", "three"],
  };

  it("scores the share of rubric points met", () => {
    expect(grade(question, { type: "self-check", met: [0, 1, 2] })).toEqual({
      correct: true,
      score: 1,
    });
    expect(grade(question, { type: "self-check", met: [0, 2, 2] })).toEqual({
      correct: false,
      score: 2 / 3,
    });
    expect(grade(question, { type: "self-check", met: [] }).score).toBe(0);
  });

  it("rejects rubric indexes that do not exist", () => {
    expect(grade(question, { type: "self-check", met: [3] })).toMatchObject({
      invalid: true,
    });
  });
});

describe("code", () => {
  const question: CodeQuestion = {
    ...base,
    id: "q.code",
    type: "code",
    starter: "",
    tests:
      "def test_one():\n    assert True\n\ndef test_two():\n    assert True\n",
  };
  const result = (one: boolean, two: boolean) => ({
    type: "code" as const,
    tests: [
      { name: "test_one", passed: one },
      { name: "test_two", passed: two },
    ],
  });

  it("finds the test functions", () => {
    expect(testNames(question.tests!)).toEqual(["test_one", "test_two"]);
  });

  it("is correct only when every test passes", () => {
    expect(grade(question, result(true, true))).toEqual({
      correct: true,
      score: 1,
    });
    expect(grade(question, result(true, false))).toEqual({
      correct: false,
      score: 0.5,
      feedback: { kind: "code", code: "tests-failed" },
    });
  });

  it("rejects results that do not match the question's tests", () => {
    expect(
      grade(question, {
        type: "code",
        tests: [{ name: "test_one", passed: true }],
      }),
    ).toMatchObject({ invalid: true });
    expect(
      grade(question, {
        type: "code",
        tests: [
          { name: "test_one", passed: true },
          { name: "test_made_up", passed: true },
        ],
      }),
    ).toMatchObject({ invalid: true });
  });

  it("cannot be graded when the lab has no tests", () => {
    expect(
      grade({ ...question, tests: undefined }, { type: "code", tests: [] }),
    ).toMatchObject({ invalid: true });
  });
});
