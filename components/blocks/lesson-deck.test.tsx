import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearProgressCache,
  getProgress,
  recordLessonCompleted,
  recordLessonStep,
} from "@/lib/progress/store";
import { renderWithIntl } from "@/tests/unit/render";

import { DeckStepSection, LessonDeck, type DeckStep } from "./lesson-deck";

const steps: DeckStep[] = [
  { kind: "see", title: "Look" },
  { kind: "do", title: "Try" },
  { kind: "check", title: "Verify" },
];

function renderDeck(lessonKey?: string) {
  return renderWithIntl(
    <LessonDeck
      steps={steps}
      lessonKey={lessonKey}
      completion={<a href="/next">Next lesson</a>}
    >
      {steps.map((step) => (
        <DeckStepSection key={step.title} {...step}>
          <p>Body of {step.title}</p>
          <input aria-label={`slider in ${step.title}`} type="range" />
        </DeckStepSection>
      ))}
    </LessonDeck>,
  );
}

const visibleHeading = () => screen.getByRole("heading", { level: 2 });

describe("LessonDeck", () => {
  beforeEach(() => {
    localStorage.clear();
    clearProgressCache();
    window.location.hash = "";
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
  });

  it("shows only the first step to begin with", () => {
    renderDeck();
    expect(visibleHeading()).toHaveTextContent("Look");
    expect(screen.getByText("Body of Try")).not.toBeVisible();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  });

  it("moves with Continue and Back and records the step in the URL", () => {
    renderDeck();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(visibleHeading()).toHaveTextContent("Try");
    expect(window.location.hash).toBe("#step-2");
    expect(visibleHeading()).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(visibleHeading()).toHaveTextContent("Look");
  });

  it("jumps to a step from the progress bar and marks it current", () => {
    renderDeck();
    const third = screen.getByRole("button", { name: /Step 3 of 3/ });
    fireEvent.click(third);
    expect(visibleHeading()).toHaveTextContent("Verify");
    expect(third).toHaveAttribute("aria-current", "step");
  });

  it("moves with the arrow keys", () => {
    renderDeck();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(visibleHeading()).toHaveTextContent("Try");
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(visibleHeading()).toHaveTextContent("Look");
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(visibleHeading()).toHaveTextContent("Look");
  });

  it("leaves arrow keys alone while a slider or input has focus", () => {
    renderDeck();
    const slider = screen.getByLabelText("slider in Look");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(visibleHeading()).toHaveTextContent("Look");
  });

  it("shows the completion panel after the last step", () => {
    renderDeck();
    fireEvent.click(screen.getByRole("button", { name: /Step 3 of 3/ }));
    fireEvent.click(screen.getByRole("button", { name: "Finish lesson" }));
    expect(visibleHeading()).toHaveTextContent("That's the lesson!");
    expect(screen.getByRole("link", { name: "Next lesson" })).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Go through it again" }),
    );
    expect(visibleHeading()).toHaveTextContent("Look");
  });

  it("saves the step reached and completion when it has a lesson key", () => {
    renderDeck("calc/intro");
    expect(getProgress().lessons["calc/intro"]).toMatchObject({
      status: "started",
      lastStep: 0,
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(getProgress().lessons["calc/intro"]?.lastStep).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: /Step 3 of 3/ }));
    fireEvent.click(screen.getByRole("button", { name: "Finish lesson" }));
    expect(getProgress().lessons["calc/intro"]).toMatchObject({
      status: "completed",
    });
    expect(getProgress().events).toEqual([
      expect.objectContaining({ kind: "lesson-completed", id: "calc/intro" }),
    ]);
  });

  it("picks up an unfinished lesson where it was left", () => {
    recordLessonStep("calc/intro", 2);
    renderDeck("calc/intro");
    expect(visibleHeading()).toHaveTextContent("Verify");
    expect(screen.getByText("Welcome back. You're on step 3.")).toBeVisible();
    // The note goes once the learner moves on.
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.queryByText(/Welcome back/)).toBeNull();
  });

  it("starts a finished lesson from the beginning, and a step in the URL wins", () => {
    recordLessonStep("calc/intro", 2);
    recordLessonCompleted("calc/intro");
    const first = renderDeck("calc/intro");
    expect(visibleHeading()).toHaveTextContent("Look");
    first.unmount();

    recordLessonStep("calc/other", 2);
    window.location.hash = "#step-2";
    renderDeck("calc/other");
    expect(visibleHeading()).toHaveTextContent("Try");
  });

  it("saves nothing without a lesson key", () => {
    renderDeck();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(getProgress().lessons).toEqual({});
  });

  it("opens at the step named in the URL hash", () => {
    window.location.hash = "#step-2";
    renderDeck();
    expect(visibleHeading()).toHaveTextContent("Try");
  });
});
