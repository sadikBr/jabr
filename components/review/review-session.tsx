"use client";

import {
  ArrowRight,
  CalendarClock,
  CircleCheck,
  RotateCcw,
  Sprout,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ConceptChip } from "@/components/content/concept-chip";
import type { ProgressCatalog } from "@/components/progress/catalog";
import { daysBetween } from "@/components/progress/dashboard-view";
import { QuestionCard } from "@/components/questions/question-card";
import { Button } from "@/components/ui/button";
import { MAX_SEED } from "@/lib/grading/prng";
import { getProgress, recordReview } from "@/lib/progress/store";
import { useProgress } from "@/lib/progress/use-progress";
import { getQuestionVariant } from "@/lib/questions/actions";
import type { QuestionView } from "@/lib/questions/view";
import {
  ratingFor,
  type ReviewAnswer,
  type ReviewRating,
} from "@/lib/review/schedule";
import {
  dueConcepts,
  MAX_CONCEPTS_PER_SESSION,
  nextDue,
  planSession,
} from "@/lib/review/session";
import { cn } from "@/lib/utils";

type Catalog = Pick<ProgressCatalog, "concepts" | "questionsByConcept">;

interface Step {
  conceptId: string;
  view: QuestionView;
  /** True for the last question on its concept. */
  lastForConcept: boolean;
}

interface ReviewResult {
  conceptId: string;
  rating: ReviewRating;
  /** Days until the concept comes back, as of when it was reviewed. */
  days: number;
}

type Phase =
  | { kind: "intro" }
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "asking"; steps: Step[]; index: number; settled: boolean }
  | {
      kind: "done";
      results: ReviewResult[];
    };

const randomSeed = () => 1 + Math.floor(Math.random() * (MAX_SEED - 1));

/**
 * A spaced-review session: a few questions on each concept that is due, one
 * at a time. Answers update mastery as usual; at the end of each concept its
 * review card is rescheduled from how the answers went.
 */
export function ReviewSession({ catalog }: { catalog: Catalog }) {
  const t = useTranslations("review");
  const progress = useProgress();
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  // What the learner got on the current concept, and every concept's result.
  const [answers, setAnswers] = useState<ReviewAnswer[]>([]);
  const [results, setResults] = useState<ReviewResult[]>([]);
  // The moment the page opened; "due" is judged against it. Read in a lazy
  // initialiser so it is not re-read on every render.
  const [now] = useState(() =>
    typeof window === "undefined" ? 0 : Date.now(),
  );

  const concept = (id: string) =>
    catalog.concepts.find((item) => item.id === id);

  async function start(conceptIds: string[]) {
    setPhase({ kind: "loading" });
    const plan = planSession(
      conceptIds,
      catalog.questionsByConcept,
      randomSeed(),
    );
    try {
      const steps: Step[] = [];
      for (const item of plan) {
        for (const [index, question] of item.questions.entries()) {
          const view = await getQuestionVariant({
            questionId: question.id,
            // Fresh numbers each time, so it is recall and not memory of the answer.
            seed: randomSeed(),
          });
          if (!view) continue;
          steps.push({
            conceptId: item.conceptId,
            view,
            lastForConcept: index === item.questions.length - 1,
          });
        }
      }
      if (steps.length === 0) throw new Error("nothing to ask");
      setAnswers([]);
      setResults([]);
      setPhase({ kind: "asking", steps, index: 0, settled: false });
    } catch {
      setPhase({ kind: "failed" });
    }
  }

  function settle(result: ReviewAnswer) {
    setAnswers((current) => [...current, result]);
    setPhase((current) =>
      current.kind === "asking" ? { ...current, settled: true } : current,
    );
  }

  function advance() {
    if (phase.kind !== "asking") return;
    const step = phase.steps[phase.index]!;
    let finished = results;
    if (step.lastForConcept) {
      const rating = ratingFor(answers);
      recordReview(step.conceptId, rating);
      finished = [
        ...results,
        {
          conceptId: step.conceptId,
          rating,
          days: daysBetween(
            Date.now(),
            getProgress().reviews[step.conceptId]?.due ?? Date.now(),
          ),
        },
      ];
      setResults(finished);
      setAnswers([]);
    }
    if (phase.index + 1 >= phase.steps.length) {
      setPhase({ kind: "done", results: finished });
    } else {
      setPhase({ ...phase, index: phase.index + 1, settled: false });
    }
  }

  if (phase.kind === "asking") {
    const step = phase.steps[phase.index]!;
    const last = phase.index + 1 >= phase.steps.length;
    const info = concept(step.conceptId);
    return (
      <div>
        <div
          role="progressbar"
          aria-label={t("progress", {
            current: phase.index + 1,
            total: phase.steps.length,
          })}
          aria-valuemin={0}
          aria-valuemax={phase.steps.length}
          aria-valuenow={phase.index + (phase.settled ? 1 : 0)}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{
              width: `${((phase.index + (phase.settled ? 1 : 0)) / phase.steps.length) * 100}%`,
            }}
          />
        </div>
        <div className="mt-4 mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            {t("progress", {
              current: phase.index + 1,
              total: phase.steps.length,
            })}
          </p>
          {info ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {t("reviewing")}
              <ConceptChip concept={info} />
            </p>
          ) : null}
        </div>

        {/* A new key per question gives each one a fresh card. */}
        <QuestionCard
          key={`${step.view.id}-${step.view.seed}`}
          initial={step.view}
          fixed
          onSettled={settle}
        />

        <div className="mt-6 flex justify-end">
          <Button size="lg" onClick={advance} disabled={!phase.settled}>
            {t(last ? "finish" : "next")}
            <ArrowRight aria-hidden="true" className="rtl:rotate-180" />
          </Button>
        </div>
      </div>
    );
  }

  if (phase.kind === "done") {
    return (
      <div className="rounded-2xl border bg-card p-6 sm:p-8">
        <span className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
          <CircleCheck aria-hidden="true" className="size-7" />
        </span>
        <h2 className="mt-4 text-2xl font-semibold">{t("doneTitle")}</h2>
        <p className="mt-1 text-muted-foreground">{t("doneBody")}</p>
        <ul className="mt-6 divide-y" data-testid="review-results">
          {phase.results.map((result) => {
            const info = concept(result.conceptId);
            return (
              <li
                key={result.conceptId}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
              >
                {info ? <ConceptChip concept={info} /> : result.conceptId}
                <span className="text-sm">
                  <span
                    className={cn(
                      "font-semibold",
                      result.rating === "good" && "text-success",
                      result.rating === "again" && "text-danger",
                    )}
                  >
                    {t(`ratings.${result.rating}`)}
                  </span>
                  <span className="text-muted-foreground">
                    {" · "}
                    {t("nextIn", { days: result.days })}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <Button asChild className="mt-6">
          <Link href="/dashboard">{t("backToProgress")}</Link>
        </Button>
      </div>
    );
  }

  // --- Before a session ----------------------------------------------------
  const due = dueConcepts(progress.reviews, catalog.questionsByConcept, now);
  const upcoming = nextDue(progress.reviews, now);
  const hasCards = Object.keys(progress.reviews).length > 0;
  const session = due.slice(0, MAX_CONCEPTS_PER_SESSION);
  const questionCount = planSession(
    session,
    catalog.questionsByConcept,
    1,
  ).reduce((total, item) => total + item.questions.length, 0);
  const busy = phase.kind === "loading";

  return (
    <div className="flex flex-col items-center rounded-2xl border bg-card px-6 py-12 text-center">
      {due.length > 0 ? (
        <>
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <RotateCcw aria-hidden="true" className="size-7" />
          </span>
          <h2 className="mt-4 text-2xl font-semibold">
            {t("dueTitle", { count: due.length })}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {t("dueBody", { questions: questionCount })}
          </p>
          <Button
            size="lg"
            className="mt-6"
            disabled={busy}
            onClick={() => start(session)}
          >
            {busy ? t("loading") : t("start")}
          </Button>
        </>
      ) : hasCards ? (
        <>
          <span className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
            <CalendarClock aria-hidden="true" className="size-7" />
          </span>
          <h2 className="mt-4 text-2xl font-semibold">{t("noneTitle")}</h2>
          {upcoming !== null ? (
            <p className="mt-2 text-muted-foreground">
              {t("noneNext", { days: daysBetween(now, upcoming) })}
            </p>
          ) : null}
          <Button
            variant="outline"
            className="mt-6"
            disabled={busy}
            onClick={() =>
              // Soonest first: reviewing early is allowed, FSRS copes with it.
              start(
                Object.entries(progress.reviews)
                  .sort(([, a], [, b]) => a.due - b.due)
                  .map(([conceptId]) => conceptId),
              )
            }
          >
            {busy ? t("loading") : t("early")}
          </Button>
        </>
      ) : (
        <>
          <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Sprout aria-hidden="true" className="size-7" />
          </span>
          <h2 className="mt-4 text-2xl font-semibold">{t("emptyTitle")}</h2>
          <p className="mt-2 max-w-md leading-relaxed text-muted-foreground">
            {t("emptyBody")}
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/dashboard">{t("emptyCta")}</Link>
          </Button>
        </>
      )}
      {phase.kind === "failed" ? (
        <p role="alert" className="mt-4 text-sm font-medium text-danger">
          {t("loadFailed")}
        </p>
      ) : null}
    </div>
  );
}
