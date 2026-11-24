import { evaluateAnswer } from "@/lib/content/parametrised";
import type { Question } from "@/lib/content/types";

import {
  compareExpressions,
  type ExpressionErrorCode,
  parseExpression,
} from "./expression";
import { diagnoseNumber, parseNumber, withinTolerance } from "./numeric";
import { defaultSeed, questionValues } from "./params";
import { hashString } from "./prng";

/** What the learner submits, by question type. */
export type QuestionResponse =
  | { type: "choices"; selected: string[] }
  | { type: "text"; value: string }
  | { type: "self-check"; met: number[] }
  | { type: "code"; tests: { name: string; passed: boolean }[] };

/**
 * Feedback is either a code the UI translates, or text written in the
 * content (choice feedback, common mistakes).
 */
export type Feedback =
  { kind: "code"; code: FeedbackCode } | { kind: "text"; text: string };

export type FeedbackCode =
  | "invalid-response"
  | "nothing-selected"
  | "select-more"
  | `input-${ExpressionErrorCode | "not-a-number"}`
  | "sign-error"
  | "power-of-ten"
  | "radians-mode"
  | "tests-failed";

export interface GradeResult {
  correct: boolean;
  /** 0 to 1. Partial credit where it makes sense. */
  score: number;
  feedback?: Feedback;
  /** True when the response could not be read; it should not count as an attempt. */
  invalid?: boolean;
}

export interface GradeContext {
  /** Selects the parameter values of a parametrised question. */
  seed?: number;
}

const code = (value: FeedbackCode): Feedback => ({ kind: "code", code: value });
const wrong = (feedback?: Feedback): GradeResult => ({
  correct: false,
  score: 0,
  feedback,
});
const invalid = (value: FeedbackCode): GradeResult => ({
  correct: false,
  score: 0,
  invalid: true,
  feedback: code(value),
});
const right: GradeResult = { correct: true, score: 1 };

/** Names of the `test_*` functions defined in a code question's tests. */
export function testNames(tests: string): string[] {
  return [...tests.matchAll(/^def (test_\w+)\s*\(/gm)].map(
    (match) => match[1]!,
  );
}

function gradeNumber(
  input: string,
  expected: number,
  question: Extract<Question, { type: "numeric" | "parametrised" }>,
  mistakes: { answer: number; feedback: Feedback }[],
): GradeResult {
  const parsed = parseNumber(input, question.unit);
  if (!parsed.ok) return invalid(`input-${parsed.error}`);
  const { value } = parsed;
  if (withinTolerance(value, expected, question.tolerance)) return right;

  const known = mistakes.find(
    (mistake) =>
      Number.isFinite(mistake.answer) &&
      withinTolerance(value, mistake.answer, question.tolerance),
  );
  if (known) return wrong(known.feedback);

  const slip = diagnoseNumber(value, expected, question.tolerance);
  if (slip === "sign") return wrong(code("sign-error"));
  if (slip === "power-of-ten") return wrong(code("power-of-ten"));
  return wrong();
}

/** Evaluates a formula, or NaN when it cannot be evaluated. */
function tryEvaluate(formula: string, values: Record<string, number>): number {
  try {
    return evaluateAnswer(formula, values);
  } catch {
    return Number.NaN;
  }
}

/**
 * Grades one response to one question. Pure: the same inputs always give the
 * same result. Runs on the server only, because it needs the answers.
 */
export function grade(
  question: Question,
  response: QuestionResponse,
  context: GradeContext = {},
): GradeResult {
  switch (question.type) {
    case "multiple-choice": {
      if (response.type !== "choices") return invalid("invalid-response");
      const known = new Set(question.choices.map((choice) => choice.id));
      const selected = [...new Set(response.selected)];
      if (selected.some((id) => !known.has(id))) {
        return invalid("invalid-response");
      }
      if (selected.length === 0) return invalid("nothing-selected");
      if (!question.multiple && selected.length > 1) {
        return invalid("invalid-response");
      }

      const correctIds = question.choices
        .filter((c) => c.correct)
        .map((c) => c.id);
      const hits = selected.filter((id) => correctIds.includes(id)).length;
      const misses = selected.length - hits;
      if (hits === correctIds.length && misses === 0) return right;

      // Targeted feedback for the first wrong choice picked, if it has any.
      const wrongChoice = question.choices.find(
        (choice) => !choice.correct && selected.includes(choice.id),
      );
      const feedback: Feedback | undefined = wrongChoice?.feedback
        ? { kind: "text", text: wrongChoice.feedback }
        : misses === 0
          ? code("select-more")
          : undefined;
      return {
        correct: false,
        score: question.multiple
          ? Math.max(0, hits - misses) / correctIds.length
          : 0,
        feedback,
      };
    }

    case "numeric": {
      if (response.type !== "text") return invalid("invalid-response");
      return gradeNumber(
        response.value,
        question.answer,
        question,
        question.commonMistakes.map((mistake) => ({
          answer: mistake.answer,
          feedback: { kind: "text", text: mistake.feedback },
        })),
      );
    }

    case "parametrised": {
      if (response.type !== "text") return invalid("invalid-response");
      const values = questionValues(
        question,
        context.seed ?? defaultSeed(question.id),
      );
      const mistakes = question.commonMistakes.map((mistake) => ({
        answer: tryEvaluate(mistake.answer, values),
        feedback: { kind: "text", text: mistake.feedback } as Feedback,
      }));
      // A formula that uses degrees gives a recognisable wrong answer on a
      // calculator left in radians mode.
      if (/\bdeg\b/.test(question.answer)) {
        mistakes.push({
          answer: tryEvaluate(
            question.answer.replace(/\s*\bdeg\b/g, ""),
            values,
          ),
          feedback: code("radians-mode"),
        });
      }
      return gradeNumber(
        response.value,
        evaluateAnswer(question.answer, values),
        question,
        mistakes,
      );
    }

    case "expression": {
      if (response.type !== "text") return invalid("invalid-response");
      const actual = parseExpression(response.value, question.variables);
      if (!actual.ok) return invalid(`input-${actual.error}`);
      const expected = parseExpression(question.answer, question.variables);
      if (!expected.ok) {
        throw new Error(`Question ${question.id} has an unreadable answer.`);
      }
      const verdict = compareExpressions(
        expected.evaluate,
        actual.evaluate,
        question.variables,
        hashString(question.id),
      );
      return verdict === "equal" ? right : wrong();
    }

    case "self-check": {
      if (response.type !== "self-check") return invalid("invalid-response");
      const met = new Set(response.met);
      if (
        [...met].some(
          (i) => !Number.isInteger(i) || i < 0 || i >= question.rubric.length,
        )
      ) {
        return invalid("invalid-response");
      }
      const score = met.size / question.rubric.length;
      return { correct: score === 1, score };
    }

    case "code": {
      if (response.type !== "code") return invalid("invalid-response");
      // The tests ran in the learner's browser, so this result is taken on
      // trust. Known limitation, recorded in AGENTS.md.
      const expected = testNames(question.tests ?? "");
      const reported = new Map(
        response.tests.map((test) => [test.name, test.passed]),
      );
      if (
        expected.length === 0 ||
        reported.size !== expected.length ||
        expected.some((name) => !reported.has(name))
      ) {
        return invalid("invalid-response");
      }
      const passed = expected.filter((name) => reported.get(name)).length;
      const score = passed / expected.length;
      return score === 1
        ? right
        : { correct: false, score, feedback: code("tests-failed") };
    }
  }
}
