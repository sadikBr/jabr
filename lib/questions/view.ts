import { renderRichText } from "@/lib/content/rich-text";
import { evaluateAnswer } from "@/lib/content/parametrised";
import type { Question } from "@/lib/content/types";
import type { QuestionType } from "@/lib/content/vocabulary";
import { testNames } from "@/lib/grading/grade";
import {
  defaultSeed,
  fillPlaceholders,
  pickParams,
} from "@/lib/grading/params";
import { formatNumber } from "@/lib/maths/functions";

/**
 * What the browser is allowed to know about a question: everything needed to
 * show and answer it, and nothing that gives the answer away. HTML fields are
 * rendered on the server from our own content.
 */
export interface QuestionView {
  id: string;
  type: QuestionType;
  seed: number;
  promptHtml: string;
  hintsHtml: string[];
  /** Parametrised questions can be retried with new numbers. */
  canVary: boolean;
  /** The concepts it practises, for updating and showing mastery. */
  concepts: { id: string; title: string }[];
  unit?: string;
  variables?: string[];
  multiple?: boolean;
  choices?: { id: string; html: string }[];
  rubricLength?: number;
  /** Code labs: tests run in the browser, so they are public by design. */
  code?: { starter: string; tests?: string; testNames: string[] };
}

/** Shown once the learner has answered correctly or asked for the solution. */
export interface QuestionSolution {
  solutionHtml?: string;
  /** The expected answer, written out. */
  answerText?: string;
  correctChoiceIds?: string[];
  rubricHtml?: string[];
}

function valuesFor(question: Question, seed: number): Record<string, number> {
  return question.type === "parametrised"
    ? pickParams(question.params, seed)
    : {};
}

export function buildQuestionView(
  question: Question,
  seed?: number,
  /** Concept titles by id. An id without a title is shown as it is. */
  conceptTitles: Readonly<Record<string, string>> = {},
): QuestionView {
  const usedSeed = seed ?? defaultSeed(question.id);
  const values = valuesFor(question, usedSeed);
  const render = (text: string) =>
    renderRichText(fillPlaceholders(text, values));

  const view: QuestionView = {
    id: question.id,
    type: question.type,
    seed: usedSeed,
    promptHtml: render(question.prompt),
    hintsHtml: question.hints.map(render),
    canVary: question.type === "parametrised",
    concepts: question.concepts.map((id) => ({
      id,
      title: conceptTitles[id] ?? id,
    })),
  };

  switch (question.type) {
    case "multiple-choice":
      view.multiple = question.multiple;
      view.choices = question.choices.map((choice) => ({
        id: choice.id,
        html: render(choice.text),
      }));
      break;
    case "numeric":
    case "parametrised":
      view.unit = question.unit;
      break;
    case "expression":
      view.variables = question.variables;
      break;
    case "self-check":
      view.rubricLength = question.rubric.length;
      break;
    case "code":
      view.code = {
        starter: question.starter,
        tests: question.tests,
        testNames: testNames(question.tests ?? ""),
      };
      break;
  }
  return view;
}

export function buildQuestionSolution(
  question: Question,
  seed?: number,
): QuestionSolution {
  const values = valuesFor(question, seed ?? defaultSeed(question.id));
  const render = (text: string) =>
    renderRichText(fillPlaceholders(text, values));
  const solution: QuestionSolution = {
    solutionHtml: question.solution ? render(question.solution) : undefined,
  };
  const withUnit = (value: number, unit?: string) =>
    unit ? `${formatNumber(value)} ${unit}` : formatNumber(value);

  switch (question.type) {
    case "multiple-choice":
      solution.correctChoiceIds = question.choices
        .filter((choice) => choice.correct)
        .map((choice) => choice.id);
      break;
    case "numeric":
      solution.answerText = withUnit(question.answer, question.unit);
      break;
    case "parametrised":
      solution.answerText = withUnit(
        evaluateAnswer(question.answer, values),
        question.unit,
      );
      break;
    case "expression":
      solution.answerText = question.answer;
      break;
    case "self-check":
      solution.rubricHtml = question.rubric.map(render);
      break;
  }
  return solution;
}
