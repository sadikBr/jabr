"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  Eye,
  Link2,
  PartyPopper,
  Pointer,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import type { StepKind } from "@/lib/content/vocabulary";
import { cn } from "@/lib/utils";

export interface DeckStep {
  kind: StepKind;
  title: string;
}

const stepIcons = {
  see: Eye,
  do: Pointer,
  check: CircleCheck,
  connect: Link2,
} as const;

interface DeckContextValue {
  steps: DeckStep[];
  current: number;
}

const DeckContext = createContext<DeckContextValue | null>(null);

/** Arrow keys belong to the control when focus is in one (sliders, inputs…). */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    target.closest('[role="slider"], [role="textbox"], .cm-editor') !== null
  );
}

/**
 * Pages a lesson one step at a time: sticky progress, Back/Continue, ←/→ keys
 * and a `#step-n` hash so a reload or shared link lands on the same step.
 * Steps past the last one show the completion panel.
 */
export function LessonDeck({
  steps,
  completion,
  children,
}: {
  steps: DeckStep[];
  completion: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("lesson");
  const [current, setCurrent] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const done = current >= steps.length;

  const goTo = useCallback(
    (index: number) => {
      const next = Math.min(Math.max(index, 0), steps.length);
      moved.current = true;
      setCurrent(next);
      history.replaceState(null, "", `#step-${next + 1}`);
    },
    [steps.length],
  );

  // Follow the step named in the URL hash, on load and when it changes.
  useEffect(() => {
    function openFromHash() {
      const match = /^#step-(\d+)$/.exec(window.location.hash);
      if (!match) return;
      const index = Number(match[1]) - 1;
      if (index >= 0 && index <= steps.length) setCurrent(index);
    }
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [steps.length]);

  // After a step change, bring the new step to the top and move focus to it.
  useEffect(() => {
    if (!moved.current) return;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    topRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    topRef.current
      ?.querySelector<HTMLElement>("[data-step-heading]:not([hidden] *)")
      ?.focus({ preventScroll: true });
  }, [current]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      if (isTypingTarget(event.target)) return;
      const forward = document.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
      const backward = document.dir === "rtl" ? "ArrowRight" : "ArrowLeft";
      if (event.key === forward) goTo(current + 1);
      else if (event.key === backward) goTo(current - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, goTo]);

  return (
    <DeckContext.Provider value={{ steps, current }}>
      <nav
        aria-label={t("progress")}
        className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 -mx-4 border-b bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
      >
        <ol className="flex items-center gap-1.5 sm:gap-2">
          {steps.map((step, index) => {
            const Icon = index < current ? Check : stepIcons[step.kind];
            const active = index === current;
            return (
              <li
                key={step.title}
                data-step={step.kind}
                className={cn("min-w-0", active ? "flex-[2_1_0%]" : "flex-1")}
              >
                <button
                  type="button"
                  onClick={() => goTo(index)}
                  aria-current={active ? "step" : undefined}
                  aria-label={`${t("stepOf", { current: index + 1, total: steps.length })}: ${t(`steps.${step.kind}`)}`}
                  className={cn(
                    "flex h-10 w-full items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition-colors",
                    active && "bg-tone text-background",
                    !active && index < current && "bg-tone-soft text-tone",
                    !active &&
                      index > current &&
                      "bg-muted text-muted-foreground hover:bg-tone-soft",
                  )}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  <span className={cn("truncate", !active && "max-sm:hidden")}>
                    {t(`steps.${step.kind}`)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div ref={topRef} className="scroll-mt-32 pt-8">
        {children}

        {done ? (
          <section
            aria-labelledby="lesson-complete"
            className="animate-rise-in rounded-2xl border bg-card p-6 text-center sm:p-10"
          >
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <PartyPopper aria-hidden="true" className="size-7" />
            </span>
            <h2
              id="lesson-complete"
              data-step-heading
              tabIndex={-1}
              className="mt-4 text-2xl font-semibold tracking-tight outline-none"
            >
              {t("completeTitle")}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              {t("completeBody")}
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {completion}
            </div>
            <Button variant="ghost" className="mt-3" onClick={() => goTo(0)}>
              {t("reviewAgain")}
            </Button>
          </section>
        ) : (
          <div className="mt-10 flex items-center justify-between gap-3 border-t pt-6">
            <Button
              variant="outline"
              size="lg"
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
            >
              <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
              {t("back")}
            </Button>
            <p className="hidden text-sm text-muted-foreground lg:block">
              {t("keyboardHint")}
            </p>
            <Button size="lg" onClick={() => goTo(current + 1)}>
              {current === steps.length - 1 ? t("finish") : t("continue")}
              <ArrowRight aria-hidden="true" className="rtl:rotate-180" />
            </Button>
          </div>
        )}
      </div>
    </DeckContext.Provider>
  );
}

/** One step of a lesson. Shown only while it is the deck's current step. */
export function DeckStepSection({
  kind,
  title,
  children,
}: {
  kind: StepKind;
  title: string;
  children: ReactNode;
}) {
  const t = useTranslations("lesson");
  const deck = useContext(DeckContext);
  const index = deck?.steps.findIndex((step) => step.title === title) ?? 0;
  // Outside a deck (e.g. a preview) every step is simply shown.
  const visible = !deck || index === deck.current;
  const Icon = stepIcons[kind] ?? Eye;
  const headingId = `step-${index + 1}-title`;

  return (
    <section
      hidden={!visible}
      data-step={kind}
      aria-labelledby={headingId}
      className={cn(visible && "animate-rise-in")}
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-tone">
        <span className="flex size-7 items-center justify-center rounded-full bg-tone-soft">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        {t(`steps.${kind}`)}
        {deck ? (
          <span className="font-normal text-muted-foreground">
            · {t("stepOf", { current: index + 1, total: deck.steps.length })}
          </span>
        ) : null}
      </p>
      <h2
        id={headingId}
        data-step-heading
        tabIndex={-1}
        className="mt-3 text-2xl font-semibold tracking-tight outline-none sm:text-3xl"
      >
        {title}
      </h2>
      <div className="prose mt-6">{children}</div>
    </section>
  );
}
