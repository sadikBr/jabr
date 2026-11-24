"use server";

import { z } from "zod";

import { renderRichText } from "@/lib/content/rich-text";
import { content } from "@/lib/content/source";
import type { Question } from "@/lib/content/types";
import {
  type FeedbackCode,
  grade,
  type QuestionResponse,
} from "@/lib/grading/grade";
import { fillPlaceholders, questionValues } from "@/lib/grading/params";
import { MAX_SEED } from "@/lib/grading/prng";

import { conceptTitles } from "./concept-titles";

import {
  buildQuestionSolution,
  buildQuestionView,
  type QuestionSolution,
  type QuestionView,
} from "./view";

// Server Functions are reachable by anyone with a POST request, so every
// input is validated here and nothing is trusted.

const questionId = z.string().min(1).max(120);
const seed = z.number().int().min(0).max(MAX_SEED);

const response = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("choices"),
    selected: z.array(z.string().max(80)).max(20),
  }),
  z.object({ type: z.literal("text"), value: z.string().max(300) }),
  z.object({
    type: z.literal("self-check"),
    met: z.array(z.number().int().min(0).max(50)).max(50),
  }),
  z.object({
    type: z.literal("code"),
    tests: z
      .array(z.object({ name: z.string().max(120), passed: z.boolean() }))
      .max(50),
  }),
]) satisfies z.ZodType<QuestionResponse>;

function findQuestion(id: string): Question | undefined {
  return content.questions.find((question) => question.id === id);
}

export type CheckResult =
  | { status: "not-found" }
  | {
      status: "graded";
      correct: boolean;
      score: number;
      /** The response could not be read; nothing was counted. */
      invalid: boolean;
      feedback?: { code: FeedbackCode } | { html: string };
      /** Present only when the answer is correct. */
      solution?: QuestionSolution;
    };

const checkInput = z.object({ questionId, seed, response });

/** Grades one answer. Phase 3 will also record the attempt here. */
export async function checkAnswer(input: unknown): Promise<CheckResult> {
  const parsed = checkInput.safeParse(input);
  if (!parsed.success) return { status: "not-found" };
  const question = findQuestion(parsed.data.questionId);
  if (!question) return { status: "not-found" };

  const result = grade(question, parsed.data.response, {
    seed: parsed.data.seed,
  });
  const values =
    question.type === "parametrised"
      ? questionValues(question, parsed.data.seed)
      : {};

  return {
    status: "graded",
    correct: result.correct,
    score: result.score,
    invalid: result.invalid ?? false,
    feedback:
      result.feedback?.kind === "text"
        ? {
            html: renderRichText(
              fillPlaceholders(result.feedback.text, values),
            ),
          }
        : result.feedback
          ? { code: result.feedback.code }
          : undefined,
    solution: result.correct
      ? buildQuestionSolution(question, parsed.data.seed)
      : undefined,
  };
}

const variantInput = z.object({ questionId, seed });

/** The same question with the numbers chosen by another seed. */
export async function getQuestionVariant(
  input: unknown,
): Promise<QuestionView | null> {
  const parsed = variantInput.safeParse(input);
  if (!parsed.success) return null;
  const question = findQuestion(parsed.data.questionId);
  return question
    ? buildQuestionView(question, parsed.data.seed, conceptTitles)
    : null;
}

/**
 * The worked solution, for a learner who asks to see it. Deliberately a
 * separate call: Phase 3 records it, and mastery counts it as not solved.
 */
export async function revealSolution(
  input: unknown,
): Promise<QuestionSolution | null> {
  const parsed = variantInput.safeParse(input);
  if (!parsed.success) return null;
  const question = findQuestion(parsed.data.questionId);
  return question ? buildQuestionSolution(question, parsed.data.seed) : null;
}
