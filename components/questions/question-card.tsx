"use client";

import {
  ArrowRight,
  Check,
  CircleHelp,
  Eye,
  Lightbulb,
  RefreshCw,
  WifiOff,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useState } from "react";

import { MasteryChanges } from "@/components/progress/mastery-changes";
import { Button } from "@/components/ui/button";
import type { FeedbackCode } from "@/lib/grading/grade";
import { MAX_SEED } from "@/lib/grading/prng";
import type { MasteryChange } from "@/lib/progress/reduce";
import { recordAttempt, recordReveal } from "@/lib/progress/store";
import { useProgress } from "@/lib/progress/use-progress";
import {
  checkAnswer,
  type CheckResult,
  getQuestionVariant,
  revealSolution,
} from "@/lib/questions/actions";
import type { QuestionSolution, QuestionView } from "@/lib/questions/view";
import { cn } from "@/lib/utils";

import { Html } from "./html";

type Status = "idle" | "checking" | "correct" | "incorrect" | "revealed";
type Feedback = { code: FeedbackCode } | { html: string } | null;
type Problem = "offline" | "failed" | null;

const seedKey = (id: string) => `jabr:seed:${id}`;

function readStoredSeed(id: string): number | null {
  try {
    const value = Number(localStorage.getItem(seedKey(id)));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * An answerable question. It only ever holds the public view of the question;
 * checking an answer is a round trip to the server, which is why it needs a
 * connection.
 */
export function QuestionCard({ initial }: { initial: QuestionView }) {
  const t = useTranslations("questions");
  const formId = useId();
  const [view, setView] = useState(initial);
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [met, setMet] = useState<number[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [problem, setProblem] = useState<Problem>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [solution, setSolution] = useState<QuestionSolution | null>(null);
  const [score, setScore] = useState(0);
  const [changes, setChanges] = useState<MasteryChange[]>([]);
  const pathname = usePathname();
  const solvedBefore = (useProgress().questions[view.id]?.correct ?? 0) > 0;

  const isSelfCheck = view.type === "self-check";
  const settled = status === "correct" || status === "revealed";
  const busy = status === "checking";

  // A learner who asked for new numbers keeps them after a reload.
  useEffect(() => {
    const stored = readStoredSeed(initial.id);
    if (stored === null || stored === initial.seed) return;
    let cancelled = false;
    getQuestionVariant({ questionId: initial.id, seed: stored })
      .then((variant) => {
        if (variant && !cancelled) setView(variant);
      })
      .catch(() => {
        // Offline: the default numbers on the page still work.
      });
    return () => {
      cancelled = true;
    };
  }, [initial.id, initial.seed]);

  function reset(next: QuestionView) {
    setView(next);
    setText("");
    setSelected([]);
    setMet([]);
    setStatus("idle");
    setFeedback(null);
    setProblem(null);
    setHintsShown(0);
    setAttempts(0);
    setSolution(null);
    setChanges([]);
  }

  async function withServer<T>(call: () => Promise<T>): Promise<T | null> {
    setProblem(null);
    try {
      return await call();
    } catch {
      setProblem(navigator.onLine ? "failed" : "offline");
      return null;
    }
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (busy || settled) return;
    const response =
      view.type === "multiple-choice"
        ? ({ type: "choices", selected } as const)
        : isSelfCheck
          ? ({ type: "self-check", met } as const)
          : ({ type: "text", value: text } as const);

    setStatus("checking");
    const result = await withServer<CheckResult>(() =>
      checkAnswer({ questionId: view.id, seed: view.seed, response }),
    );
    if (!result || result.status !== "graded") {
      setStatus(attempts > 0 ? "incorrect" : "idle");
      if (result) setProblem("failed");
      return;
    }
    setFeedback(result.feedback ?? null);
    if (result.invalid) {
      setStatus(attempts > 0 ? "incorrect" : "idle");
      return;
    }
    setAttempts((count) => count + 1);
    setScore(result.score);
    // Progress is kept on this device; the server only grades.
    setChanges(
      recordAttempt({
        questionId: view.id,
        concepts: view.concepts.map((concept) => concept.id),
        contextId: pathname,
        seed: view.seed,
        correct: result.correct,
        score: result.score,
        hintsUsed: hintsShown,
        selfAssessed: isSelfCheck,
      }),
    );
    if (isSelfCheck) {
      // A self-check is a reflection, not a pass/fail: it is done once saved.
      setStatus(result.correct ? "correct" : "revealed");
      return;
    }
    if (result.correct) {
      setSolution(result.solution ?? null);
      setStatus("correct");
    } else {
      setStatus("incorrect");
    }
  }

  async function reveal() {
    const result = await withServer(() =>
      revealSolution({ questionId: view.id, seed: view.seed }),
    );
    if (!result) return;
    setSolution(result);
    setFeedback(null);
    // For a self-check, revealing the model answer is the next step, not the end.
    if (isSelfCheck) return;
    setStatus("revealed");
    setChanges(
      recordReveal({
        questionId: view.id,
        concepts: view.concepts.map((concept) => concept.id),
        contextId: pathname,
        seed: view.seed,
      }),
    );
  }

  async function newNumbers() {
    const seed = 1 + Math.floor(Math.random() * (MAX_SEED - 1));
    const variant = await withServer(() =>
      getQuestionVariant({ questionId: view.id, seed }),
    );
    if (!variant) return;
    try {
      localStorage.setItem(seedKey(view.id), String(seed));
    } catch {
      // Without storage the new numbers simply last until the next reload.
    }
    reset(variant);
  }

  function toggleChoice(id: string) {
    if (settled) return;
    setStatus((current) => (current === "incorrect" ? "idle" : current));
    setFeedback(null);
    setSelected((current) =>
      view.multiple
        ? current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id]
        : [id],
    );
  }

  const canSubmit =
    view.type === "multiple-choice"
      ? selected.length > 0
      : isSelfCheck
        ? solution !== null
        : text.trim() !== "";
  const feedbackText =
    feedback && "code" in feedback ? t(`feedback.${feedback.code}`) : null;
  const correctIds = solution?.correctChoiceIds ?? [];

  return (
    <article
      data-question={view.id}
      data-status={status}
      className={cn(
        "not-prose relative overflow-hidden rounded-2xl border bg-card shadow-xs transition-colors",
        status === "correct" && "border-success",
        status === "incorrect" && "border-danger/60",
      )}
    >
      <header className="flex items-center gap-2 border-b px-4 py-2.5 sm:px-5">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full",
            status === "correct"
              ? "animate-pop bg-success text-background"
              : "bg-tone-soft text-tone",
          )}
        >
          {status === "correct" ? (
            <Check aria-hidden="true" className="size-4" strokeWidth={3} />
          ) : (
            <CircleHelp aria-hidden="true" className="size-4" />
          )}
        </span>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t(`types.${view.type}`)}
        </p>
        {solvedBefore && status === "idle" ? (
          <span className="flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
            <Check aria-hidden="true" className="size-3" strokeWidth={3} />
            {t("solvedBefore")}
          </span>
        ) : null}
        {view.canVary && (settled || attempts > 0) ? (
          <Button
            variant="ghost"
            className="ms-auto -me-2 h-8 px-2 text-xs"
            onClick={newNumbers}
          >
            <RefreshCw aria-hidden="true" />
            {t("newNumbers")}
          </Button>
        ) : null}
      </header>

      <form onSubmit={submit} className="p-4 sm:p-5" noValidate>
        <Html
          id={`${formId}-prompt`}
          html={view.promptHtml}
          className="rich text-[1.0625rem] leading-relaxed font-medium"
        />

        {view.type === "multiple-choice" ? (
          <fieldset
            className="mt-4 grid gap-2"
            aria-labelledby={`${formId}-prompt`}
            disabled={busy}
          >
            {view.choices?.map((choice) => {
              const isSelected = selected.includes(choice.id);
              const showRight = settled && correctIds.includes(choice.id);
              const showWrong =
                isSelected &&
                (status === "incorrect" ||
                  (settled && !correctIds.includes(choice.id)));
              return (
                <label
                  key={choice.id}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-2.5 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
                    !isSelected &&
                      !showRight &&
                      "border-transparent bg-background hover:border-tone/50",
                    isSelected &&
                      !showRight &&
                      !showWrong &&
                      "border-tone bg-tone-soft",
                    showRight && "border-success bg-success-soft",
                    showWrong && "border-danger/70 bg-danger-soft",
                    settled && "cursor-default",
                    status === "incorrect" && isSelected && "animate-shake",
                  )}
                >
                  <input
                    type={view.multiple ? "checkbox" : "radio"}
                    name={`${formId}-choice`}
                    className="sr-only"
                    checked={isSelected}
                    disabled={settled}
                    onChange={() => toggleChoice(choice.id)}
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center border-2",
                      view.multiple ? "rounded-md" : "rounded-full",
                      isSelected || showRight
                        ? "border-current"
                        : "border-muted-foreground/50",
                      showRight && "text-success",
                      showWrong && "text-danger",
                      isSelected && !showRight && !showWrong && "text-tone",
                    )}
                  >
                    {showRight ? (
                      <Check className="size-3.5" strokeWidth={3.5} />
                    ) : showWrong ? (
                      <X className="size-3.5" strokeWidth={3.5} />
                    ) : isSelected ? (
                      <span className="size-2.5 rounded-[inherit] bg-current" />
                    ) : null}
                  </span>
                  <Html html={choice.html} className="rich min-w-0 flex-1" />
                </label>
              );
            })}
          </fieldset>
        ) : null}

        {view.type === "numeric" ||
        view.type === "parametrised" ||
        view.type === "expression" ? (
          <div className="mt-4">
            <div
              className={cn(
                "flex h-13 items-center gap-2 rounded-xl border-2 bg-background px-4 transition-colors focus-within:border-tone",
                status === "correct" && "border-success bg-success-soft",
                status === "incorrect" && "animate-shake border-danger/70",
              )}
            >
              {view.type === "expression" ? (
                <span
                  aria-hidden="true"
                  className="font-mono text-sm text-muted-foreground"
                >
                  =
                </span>
              ) : null}
              <input
                type="text"
                inputMode={view.type === "expression" ? "text" : "decimal"}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                aria-labelledby={`${formId}-prompt`}
                aria-describedby={`${formId}-feedback`}
                placeholder={t(
                  view.type === "expression"
                    ? "placeholders.expression"
                    : "placeholders.number",
                )}
                value={text}
                readOnly={settled}
                onChange={(event) => {
                  setText(event.target.value);
                  if (status === "incorrect") setStatus("idle");
                  setFeedback(null);
                }}
                className="min-w-0 flex-1 bg-transparent font-mono text-lg outline-none placeholder:text-muted-foreground/70"
              />
              {view.unit ? (
                <span className="shrink-0 font-medium text-muted-foreground">
                  {view.unit}
                </span>
              ) : null}
            </div>
            {view.type === "expression" ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("expressionHelp", {
                  variables: (view.variables ?? []).join(", "),
                })}
              </p>
            ) : null}
          </div>
        ) : null}

        {isSelfCheck ? (
          <div className="mt-4">
            <textarea
              aria-labelledby={`${formId}-prompt`}
              rows={3}
              value={text}
              readOnly={solution !== null}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("placeholders.selfCheck")}
              className="block w-full resize-y rounded-xl border-2 bg-background px-4 py-3 leading-relaxed outline-none placeholder:text-muted-foreground/70 focus:border-tone"
            />
            {solution?.rubricHtml ? (
              <fieldset className="mt-4" disabled={settled || busy}>
                <legend className="text-sm font-semibold">
                  {t("selfCheck.legend")}
                </legend>
                <div className="mt-2 grid gap-2">
                  {solution.rubricHtml.map((html, index) => (
                    <label
                      key={index}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-transparent bg-background px-4 py-3 has-checked:border-success has-checked:bg-success-soft"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 accent-success"
                        checked={met.includes(index)}
                        onChange={() =>
                          setMet((current) =>
                            current.includes(index)
                              ? current.filter((item) => item !== index)
                              : [...current, index],
                          )
                        }
                      />
                      <Html html={html} className="rich min-w-0 flex-1" />
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
          </div>
        ) : null}

        <div
          id={`${formId}-feedback`}
          aria-live="polite"
          className="mt-4 space-y-3 empty:hidden"
        >
          {status === "correct" && !isSelfCheck ? (
            <p className="animate-rise-in flex items-center gap-2 font-semibold text-success">
              <Check aria-hidden="true" className="size-5" strokeWidth={3} />
              {t(attempts > 1 ? "correctAfterRetry" : "correct")}
            </p>
          ) : null}
          {settled && isSelfCheck ? (
            <p className="animate-rise-in font-semibold text-success">
              {t("selfCheck.saved", {
                met: Math.round(score * (view.rubricLength ?? 0)),
                total: view.rubricLength ?? 0,
              })}
            </p>
          ) : null}
          {status === "incorrect" ? (
            <p className="animate-rise-in font-semibold text-danger">
              {t("incorrect")}
            </p>
          ) : null}
          {feedback && "html" in feedback ? (
            <Html
              html={feedback.html}
              className="rich rounded-xl bg-muted px-4 py-3"
            />
          ) : null}
          {feedbackText ? (
            <p className="rounded-xl bg-muted px-4 py-3">{feedbackText}</p>
          ) : null}
          {problem ? (
            <p className="flex items-start gap-2 rounded-xl bg-muted px-4 py-3">
              <WifiOff aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              {t(`problems.${problem}`)}
            </p>
          ) : null}
          <MasteryChanges changes={changes} concepts={view.concepts} />
        </div>

        {hintsShown > 0 ? (
          <ol className="mt-4 space-y-2">
            {view.hintsHtml.slice(0, hintsShown).map((html, index) => (
              <li
                key={index}
                className="animate-rise-in flex gap-3 rounded-e-xl border-s-4 border-accent bg-accent/10 px-4 py-3"
              >
                <Lightbulb
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-accent-foreground dark:text-accent"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t("hintOf", {
                      current: index + 1,
                      total: view.hintsHtml.length,
                    })}
                  </p>
                  <Html html={html} className="rich" />
                </div>
              </li>
            ))}
          </ol>
        ) : null}

        {!settled ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {isSelfCheck && solution === null ? (
              <Button
                type="button"
                onClick={reveal}
                disabled={text.trim() === ""}
              >
                {t("selfCheck.compare")}
                <ArrowRight aria-hidden="true" className="rtl:rotate-180" />
              </Button>
            ) : (
              <Button type="submit" disabled={!canSubmit || busy}>
                {busy
                  ? t("checking")
                  : isSelfCheck
                    ? t("selfCheck.save")
                    : status === "incorrect"
                      ? t("tryAgain")
                      : t("check")}
              </Button>
            )}
            {hintsShown < view.hintsHtml.length ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setHintsShown((count) => count + 1)}
              >
                <Lightbulb aria-hidden="true" />
                {hintsShown === 0 ? t("hint") : t("anotherHint")}
              </Button>
            ) : null}
            {!isSelfCheck && attempts > 0 ? (
              <Button type="button" variant="ghost" onClick={reveal}>
                <Eye aria-hidden="true" />
                {t("showSolution")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </form>

      {solution && (settled || isSelfCheck) ? (
        <SolutionPanel
          solution={solution}
          open={status === "revealed" || isSelfCheck}
          labels={{
            title: t("solution"),
            answer: t("answer"),
          }}
        />
      ) : null}
    </article>
  );
}

function SolutionPanel({
  solution,
  open,
  labels,
}: {
  solution: QuestionSolution;
  open: boolean;
  labels: { title: string; answer: string };
}) {
  if (!solution.solutionHtml && !solution.answerText) return null;
  return (
    <details open={open} className="group border-t bg-muted/50">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold sm:px-5 [&::-webkit-details-marker]:hidden">
        <Eye aria-hidden="true" className="size-4 text-muted-foreground" />
        {labels.title}
        <ArrowRight
          aria-hidden="true"
          className="ms-auto size-4 text-muted-foreground transition-transform group-open:rotate-90"
        />
      </summary>
      <div className="space-y-3 px-4 pb-5 sm:px-5">
        {solution.answerText ? (
          <p>
            <span className="text-sm text-muted-foreground">
              {labels.answer}{" "}
            </span>
            <span className="font-mono font-semibold">
              {solution.answerText}
            </span>
          </p>
        ) : null}
        {solution.solutionHtml ? (
          <Html html={solution.solutionHtml} className="rich space-y-3" />
        ) : null}
      </div>
    </details>
  );
}
