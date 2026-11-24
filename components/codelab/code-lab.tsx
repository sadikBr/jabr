"use client";

import {
  Check,
  CircleAlert,
  Play,
  RotateCcw,
  Square,
  Terminal,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Html } from "@/components/questions/html";
import { Button } from "@/components/ui/button";
import { describeTest, type RunOutcome } from "@/lib/codelab/harness";
import {
  runPython,
  type RunResult,
  type RunStatus,
  stopPython,
} from "@/lib/codelab/runner";
import { checkAnswer } from "@/lib/questions/actions";
import type { QuestionSolution, QuestionView } from "@/lib/questions/view";
import { cn } from "@/lib/utils";

const CodeEditor = dynamic(() => import("./editor"), {
  ssr: false,
  loading: () => <div className="min-h-32" />,
});

const codeKey = (id: string) => `jabr:code:${id}`;

type Phase =
  | { kind: "idle" }
  | { kind: "busy"; status: RunStatus | "starting" }
  | { kind: "done"; result: RunResult };

/**
 * A Python editor that runs in the browser. With tests it is a graded
 * exercise; without, a playground. The learner's code is kept on this device.
 */
export function CodeLab({ view }: { view: QuestionView }) {
  const t = useTranslations("codelab");
  const starter = view.code?.starter ?? "";
  const tests = view.code?.tests;
  const [code, setCode] = useState(starter);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [output, setOutput] = useState("");
  const [solution, setSolution] = useState<QuestionSolution | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const busy = phase.kind === "busy";

  // Bring back what the learner wrote last time.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(codeKey(view.id));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- storage only exists in the browser
      if (saved !== null && saved !== starter) setCode(saved);
    } catch {
      // No storage: start from the starter code.
    }
  }, [view.id, starter]);

  // Leaving the page must not leave a program running.
  useEffect(() => () => stopPython(), []);

  function edit(next: string) {
    setCode(next);
    try {
      if (next === starter) localStorage.removeItem(codeKey(view.id));
      else localStorage.setItem(codeKey(view.id), next);
    } catch {
      // Not saved; the code still runs.
    }
  }

  async function run() {
    if (busy) return;
    setOutput("");
    setPhase({ kind: "busy", status: "starting" });
    const result = await runPython({
      code,
      tests,
      onStatus: (status) => setPhase({ kind: "busy", status }),
      onOutput: (text) => setOutput((current) => `${current}${text}\n`),
    });
    setPhase({ kind: "done", result });
    requestAnimationFrame(() =>
      outputRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      }),
    );

    const outcome = result.kind === "finished" ? result.outcome : null;
    if (outcome && outcome.tests.length > 0 && !outcome.error) {
      // Tests ran here in the browser; the server records the result.
      try {
        const graded = await checkAnswer({
          questionId: view.id,
          seed: view.seed,
          response: {
            type: "code",
            tests: outcome.tests.map(({ name, passed }) => ({ name, passed })),
          },
        });
        if (graded.status === "graded" && graded.correct) {
          setSolution(graded.solution ?? null);
        }
      } catch {
        // Offline: the tests above still tell the learner how they did.
      }
    }
  }

  const outcome: RunOutcome | null =
    phase.kind === "done" && phase.result.kind === "finished"
      ? phase.result.outcome
      : null;
  const passed = outcome?.tests.filter((test) => test.passed).length ?? 0;
  const allPassed =
    !!outcome &&
    !outcome.error &&
    outcome.tests.length > 0 &&
    passed === outcome.tests.length;
  const notice =
    phase.kind === "done" && phase.result.kind !== "finished"
      ? phase.result.kind
      : null;
  const hasOutput = output !== "" || outcome !== null || notice !== null;

  return (
    <section
      data-codelab={view.id}
      data-subject="computing"
      className={cn(
        "not-prose overflow-hidden rounded-2xl border bg-card shadow-xs",
        allPassed && "border-success",
      )}
    >
      {view.promptHtml ? (
        <Html
          html={view.promptHtml}
          className="rich border-b px-4 py-4 leading-relaxed sm:px-5"
        />
      ) : null}

      <div className="flex items-center gap-2 border-b bg-muted/60 px-3 py-2 sm:px-4">
        <span className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 font-mono text-xs font-medium">
          <span aria-hidden="true" className="size-2 rounded-full bg-tone" />
          main.py
        </span>
        <div className="ms-auto flex items-center gap-1.5">
          {code !== starter ? (
            <Button
              variant="ghost"
              className="h-9 px-2.5"
              onClick={() => edit(starter)}
              disabled={busy}
            >
              <RotateCcw aria-hidden="true" />
              <span className="max-sm:sr-only">{t("reset")}</span>
            </Button>
          ) : null}
          {busy ? (
            <Button variant="outline" className="h-9" onClick={stopPython}>
              <Square aria-hidden="true" className="fill-current" />
              {t("stop")}
            </Button>
          ) : (
            <Button
              className="h-9 bg-tone text-background hover:bg-tone/90"
              onClick={run}
            >
              <Play aria-hidden="true" className="fill-current" />
              {tests ? t("runAndCheck") : t("run")}
            </Button>
          )}
        </div>
      </div>

      <CodeEditor
        value={code}
        onChange={edit}
        onRun={run}
        label={t("editorLabel")}
      />

      <p className="border-t px-4 py-2 text-xs text-muted-foreground sm:px-5">
        <span className="hidden sm:inline">{t("shortcut")} </span>
        <span className="sm:hidden">{t("smallScreen")} </span>
        {t("tabHint")}
      </p>

      <div
        ref={outputRef}
        aria-live="polite"
        className="border-t bg-console text-console-foreground"
      >
        <p className="flex items-center gap-2 px-4 pt-3 text-xs font-semibold tracking-wide uppercase opacity-70 sm:px-5">
          <Terminal aria-hidden="true" className="size-4" />
          {t("output")}
          {busy ? (
            <span className="tracking-normal normal-case">
              · {t(`status.${phase.status}`)}
            </span>
          ) : null}
        </p>

        <div className="space-y-3 px-4 pt-2 pb-4 sm:px-5">
          {!hasOutput && !busy ? (
            <p className="text-sm opacity-60">{t("empty")}</p>
          ) : null}
          {busy && output === "" ? (
            <p className="flex items-center gap-2 text-sm opacity-70">
              <span className="size-2 animate-pulse rounded-full bg-current" />
              {t(`status.${phase.status}`)}
            </p>
          ) : null}

          {output !== "" ? (
            <pre
              data-testid="codelab-output"
              className="overflow-x-auto font-mono text-sm leading-relaxed whitespace-pre-wrap"
            >
              {output}
            </pre>
          ) : null}

          {outcome?.plots.map((plot, index) => (
            // eslint-disable-next-line @next/next/no-img-element -- generated in the browser, not a file
            <img
              key={index}
              src={`data:image/png;base64,${plot}`}
              alt={t("plotAlt", { number: index + 1 })}
              className="max-w-full rounded-lg bg-white"
            />
          ))}

          {outcome?.error ? (
            <div className="flex gap-3 rounded-xl bg-red-500/15 px-4 py-3 text-sm">
              <CircleAlert
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-red-400"
              />
              <div className="min-w-0">
                <p className="font-semibold">
                  {outcome.error.line
                    ? t("errorOnLine", {
                        type: outcome.error.type,
                        line: outcome.error.line,
                      })
                    : outcome.error.type}
                </p>
                <p className="font-mono break-words opacity-90">
                  {outcome.error.message}
                </p>
              </div>
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-xl bg-white/10 px-4 py-3 text-sm">
              <p>{t(`notices.${notice}`)}</p>
              {phase.kind === "done" && phase.result.kind === "unavailable" ? (
                <p
                  data-testid="codelab-crash"
                  className="mt-1 font-mono text-xs break-words opacity-60"
                >
                  {phase.result.message}
                </p>
              ) : null}
            </div>
          ) : null}

          {outcome && outcome.tests.length > 0 ? (
            <div>
              <p className="text-sm font-semibold">
                {allPassed
                  ? t("allPassed")
                  : t("testsPassed", { passed, total: outcome.tests.length })}
              </p>
              <ul className="mt-2 space-y-1.5">
                {outcome.tests.map((test) => (
                  <li key={test.name} className="flex gap-2.5 text-sm">
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                        test.passed
                          ? "bg-emerald-500 text-white"
                          : "bg-red-500 text-white",
                      )}
                    >
                      {test.passed ? (
                        <Check
                          aria-hidden="true"
                          className="size-3.5"
                          strokeWidth={3}
                        />
                      ) : (
                        <X
                          aria-hidden="true"
                          className="size-3.5"
                          strokeWidth={3}
                        />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="sr-only">
                        {test.passed ? t("passed") : t("failed")}:{" "}
                      </span>
                      {describeTest(test.name)}
                      {!test.passed && test.message ? (
                        <span className="block font-mono text-xs break-words opacity-80">
                          {test.message}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {allPassed && solution?.solutionHtml ? (
        <details className="group border-t">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold sm:px-5 [&::-webkit-details-marker]:hidden">
            {t("solution")}
          </summary>
          <Html
            html={solution.solutionHtml}
            className="rich space-y-3 px-4 pb-5 sm:px-5"
          />
        </details>
      ) : null}
    </section>
  );
}
