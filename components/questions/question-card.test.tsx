import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearProgressCache,
  getProgress,
  recordAttempt,
} from "@/lib/progress/store";
import type { CheckResult } from "@/lib/questions/actions";
import type { QuestionView } from "@/lib/questions/view";
import { renderWithIntl } from "@/tests/unit/render";

import { QuestionCard } from "./question-card";

const actions = vi.hoisted(() => ({
  checkAnswer: vi.fn(),
  getQuestionVariant: vi.fn(),
  revealSolution: vi.fn(),
}));
vi.mock("@/lib/questions/actions", () => actions);
vi.mock("next/navigation", () => ({ usePathname: () => "/lesson" }));

const numeric: QuestionView = {
  id: "q.numeric",
  type: "parametrised",
  seed: 5,
  promptHtml: "What is 2 × 3?",
  hintsHtml: ["First hint", "Second hint"],
  canVary: true,
  concepts: [{ id: "slope", title: "Slope of a line" }],
  unit: "m",
};

const choice: QuestionView = {
  id: "q.choice",
  type: "multiple-choice",
  seed: 5,
  promptHtml: "Pick one",
  hintsHtml: [],
  canVary: false,
  concepts: [],
  multiple: false,
  choices: [
    { id: "a", html: "Alpha" },
    { id: "b", html: "Beta" },
  ],
};

const selfCheck: QuestionView = {
  id: "q.self",
  type: "self-check",
  seed: 5,
  promptHtml: "Explain it",
  hintsHtml: [],
  canVary: false,
  concepts: [],
  rubricLength: 2,
};

const graded = (
  overrides: Partial<Extract<CheckResult, { status: "graded" }>>,
) =>
  ({
    status: "graded",
    correct: false,
    score: 0,
    invalid: false,
    ...overrides,
  }) as CheckResult;

const check = () => screen.getByRole("button", { name: /^Check/ });

describe("QuestionCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearProgressCache();
  });

  it("sends the answer with the question's seed and celebrates a correct one", async () => {
    actions.checkAnswer.mockResolvedValue(
      graded({
        correct: true,
        score: 1,
        solution: { answerText: "6 m", solutionHtml: "Because." },
      }),
    );
    renderWithIntl(<QuestionCard initial={numeric} />);
    expect(check()).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "6" } });
    fireEvent.click(check());

    expect(await screen.findByText("Correct!")).toBeVisible();
    expect(actions.checkAnswer).toHaveBeenCalledWith({
      questionId: "q.numeric",
      seed: 5,
      response: { type: "text", value: "6" },
    });
    expect(screen.getByText("6 m")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("readonly");
    expect(screen.queryByRole("button", { name: /^Check/ })).toBeNull();
  });

  it("lets the learner try again after a wrong answer, with feedback", async () => {
    actions.checkAnswer.mockResolvedValue(
      graded({ feedback: { code: "sign-error" } }),
    );
    renderWithIntl(<QuestionCard initial={numeric} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "-6" } });
    fireEvent.click(check());

    expect(await screen.findByText(/Not quite/)).toBeVisible();
    expect(screen.getByText(/Right size, wrong sign/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Check again" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Show the solution" }),
    ).toBeVisible();
  });

  it("does not count an unreadable answer as an attempt", async () => {
    actions.checkAnswer.mockResolvedValue(
      graded({ invalid: true, feedback: { code: "input-syntax" } }),
    );
    renderWithIntl(<QuestionCard initial={numeric} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "6 +" } });
    fireEvent.click(check());

    expect(await screen.findByText(/doesn't read as maths/)).toBeVisible();
    expect(screen.queryByText(/Not quite/)).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Show the solution" }),
    ).toBeNull();
  });

  it("reveals hints one at a time", () => {
    renderWithIntl(<QuestionCard initial={numeric} />);
    fireEvent.click(screen.getByRole("button", { name: "Give me a hint" }));
    expect(screen.getByText("First hint")).toBeVisible();
    expect(screen.queryByText("Second hint")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Another hint" }));
    expect(screen.getByText("Second hint")).toBeVisible();
    expect(screen.queryByRole("button", { name: /hint/i })).toBeNull();
  });

  it("shows the solution on request after an attempt", async () => {
    actions.checkAnswer.mockResolvedValue(graded({}));
    actions.revealSolution.mockResolvedValue({
      answerText: "6 m",
      solutionHtml: "Two threes.",
    });
    renderWithIntl(<QuestionCard initial={numeric} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "5" } });
    fireEvent.click(check());
    fireEvent.click(
      await screen.findByRole("button", { name: "Show the solution" }),
    );

    expect(await screen.findByText("Two threes.")).toBeVisible();
    expect(actions.revealSolution).toHaveBeenCalledWith({
      questionId: "q.numeric",
      seed: 5,
    });
  });

  it("says so when offline, and keeps the answer", async () => {
    actions.checkAnswer.mockRejectedValue(new Error("network"));
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    renderWithIntl(<QuestionCard initial={numeric} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "6" } });
    fireEvent.click(check());

    expect(await screen.findByText(/You're offline/)).toBeVisible();
    expect(screen.getByRole("textbox")).toHaveValue("6");
    expect(check()).toBeEnabled();
  });

  it("fetches new numbers and remembers them for the next visit", async () => {
    actions.checkAnswer.mockResolvedValue(graded({ correct: true, score: 1 }));
    actions.getQuestionVariant.mockResolvedValue({
      ...numeric,
      seed: 4242,
      promptHtml: "What is 2 × 9?",
    });
    renderWithIntl(<QuestionCard initial={numeric} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "6" } });
    fireEvent.click(check());
    fireEvent.click(await screen.findByRole("button", { name: "New numbers" }));

    expect(await screen.findByText("What is 2 × 9?")).toBeVisible();
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(localStorage.getItem("jabr:seed:q.numeric")).toMatch(/^\d+$/);
  });

  it("loads the remembered numbers on a later visit", async () => {
    localStorage.setItem("jabr:seed:q.numeric", "4242");
    actions.getQuestionVariant.mockResolvedValue({
      ...numeric,
      seed: 4242,
      promptHtml: "What is 2 × 9?",
    });
    renderWithIntl(<QuestionCard initial={numeric} />);
    expect(await screen.findByText("What is 2 × 9?")).toBeVisible();
    expect(actions.getQuestionVariant).toHaveBeenCalledWith({
      questionId: "q.numeric",
      seed: 4242,
    });
  });

  it("saves the attempt on this device and says what moved", async () => {
    actions.checkAnswer.mockResolvedValue(graded({ correct: true, score: 1 }));
    renderWithIntl(<QuestionCard initial={numeric} />);
    fireEvent.click(screen.getByRole("button", { name: "Give me a hint" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "6" } });
    fireEvent.click(check());
    await screen.findByText("Correct!");

    const saved = getProgress();
    expect(saved.attempts).toEqual([
      expect.objectContaining({
        questionId: "q.numeric",
        seed: 5,
        correct: true,
        hintsUsed: 1,
      }),
    ]);
    expect(saved.mastery.slope?.score).toBeCloseTo(0.21, 10); // 0.3 × 0.7 for one hint
    const changes = screen.getByTestId("mastery-changes");
    expect(changes).toHaveTextContent("Slope of a line");
    expect(changes).toHaveTextContent("Not started");
    expect(changes).toHaveTextContent("Learning");
  });

  it("does not save an unreadable answer, and counts a revealed solution against the concept", async () => {
    actions.checkAnswer.mockResolvedValueOnce(
      graded({ invalid: true, feedback: { code: "input-syntax" } }),
    );
    renderWithIntl(<QuestionCard initial={numeric} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "6 +" } });
    fireEvent.click(check());
    await screen.findByText(/doesn't read as maths/);
    expect(getProgress().attempts).toHaveLength(0);

    actions.checkAnswer.mockResolvedValue(graded({}));
    actions.revealSolution.mockResolvedValue({ answerText: "6 m" });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "5" } });
    fireEvent.click(check());
    fireEvent.click(
      await screen.findByRole("button", { name: "Show the solution" }),
    );
    await screen.findByText("6 m");
    expect(getProgress().questions["q.numeric"]).toMatchObject({
      attempts: 2,
      wrong: 2,
      revealed: 1,
      correct: 0,
    });
  });

  it("marks a question solved on an earlier visit", () => {
    recordAttempt({
      questionId: "q.numeric",
      concepts: ["slope"],
      contextId: "/",
      seed: 5,
      correct: true,
      score: 1,
      hintsUsed: 0,
    });
    renderWithIntl(<QuestionCard initial={numeric} />);
    expect(screen.getByText("Solved")).toBeVisible();
  });

  it("submits the selected choice and marks the right one", async () => {
    actions.checkAnswer.mockResolvedValue(
      graded({
        correct: true,
        score: 1,
        solution: { correctChoiceIds: ["b"] },
      }),
    );
    renderWithIntl(<QuestionCard initial={choice} />);
    expect(check()).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "Beta" }));
    fireEvent.click(check());

    await screen.findByText("Correct!");
    expect(actions.checkAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        response: { type: "choices", selected: ["b"] },
      }),
    );
    expect(screen.getByRole("radio", { name: "Beta" })).toBeDisabled();
  });

  it("walks a self-check through write, compare and tick", async () => {
    actions.revealSolution.mockResolvedValue({
      rubricHtml: ["Point one", "Point two"],
      solutionHtml: "Model answer.",
    });
    actions.checkAnswer.mockResolvedValue(graded({ score: 0.5 }));
    renderWithIntl(<QuestionCard initial={selfCheck} />);

    const compare = screen.getByRole("button", {
      name: /Compare with a model answer/,
    });
    expect(compare).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "My thoughts" },
    });
    fireEvent.click(compare);

    fireEvent.click(await screen.findByRole("checkbox", { name: "Point one" }));
    expect(screen.getByText("Model answer.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Save my self-check" }));

    await waitFor(() =>
      expect(actions.checkAnswer).toHaveBeenCalledWith(
        expect.objectContaining({ response: { type: "self-check", met: [0] } }),
      ),
    );
    expect(
      await screen.findByText("Saved: 1 of 2 points covered."),
    ).toBeVisible();
  });
});
