"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Html } from "@/components/questions/html";
import type { InteractiveProps } from "@/lib/content/interactive-specs";
import { formatNumber } from "@/lib/maths/functions";
import { eulerSteps, odeProblems } from "@/lib/sim/euler";

import { GoalBanner, Readout, Slider, useGoal } from "./parts";

const WIDTH = 520;
const HEIGHT = 300;
const PAD = { left: 44, right: 16, top: 16, bottom: 34 };
const MAX_STEPS = 64;

/**
 * Euler's method against the exact answer. Fewer, bigger steps drift away
 * from the true curve; more, smaller steps hug it. `equationHtml` is rendered
 * on the server so KaTeX stays out of the browser bundle.
 */
export function EulerStepper({
  problem: problemId,
  steps: initialSteps,
  goal,
  equationHtml,
}: InteractiveProps<"euler-stepper"> & { equationHtml?: string }) {
  const t = useTranslations("interactives.euler");
  const problem = odeProblems[problemId];
  const [steps, setSteps] = useState(initialSteps);
  const [goalRef, reachGoal] = useGoal("euler-stepper");

  const [yMin, yMax] = problem.yRange;
  const toX = (time: number) =>
    PAD.left + (time / problem.tEnd) * (WIDTH - PAD.left - PAD.right);
  const toY = (value: number) =>
    HEIGHT -
    PAD.bottom -
    ((Math.min(Math.max(value, yMin), yMax) - yMin) / (yMax - yMin)) *
      (HEIGHT - PAD.top - PAD.bottom);

  const points = eulerSteps(problem, steps);
  const exactEnd = problem.exact(problem.tEnd);
  const eulerEnd = points[points.length - 1]!.y;
  const error = Math.abs(eulerEnd - exactEnd);
  const reached = goal !== undefined && error <= goal.maxError;

  useEffect(() => {
    if (reached) reachGoal();
  }, [reached, reachGoal]);

  const exactCurve = Array.from({ length: 121 }, (_, i) => {
    const time = (problem.tEnd * i) / 120;
    return `${toX(time).toFixed(1)},${toY(problem.exact(time)).toFixed(1)}`;
  }).join(" ");
  const eulerLine = points
    .map((p) => `${toX(p.t).toFixed(1)},${toY(p.y).toFixed(1)}`)
    .join(" ");
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => yMin + f * (yMax - yMin));
  const tTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * problem.tEnd);

  return (
    <div ref={goalRef} data-subject="maths">
      {equationHtml ? (
        <Html
          html={equationHtml}
          className="border-b px-4 py-3 text-center text-sm text-muted-foreground sm:px-5"
        />
      ) : null}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t("description", { steps })}
        className="block w-full bg-background"
      >
        {yTicks.map((value) => (
          <g key={value}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={toY(value)}
              y2={toY(value)}
              className="stroke-border"
            />
            <text
              x={PAD.left - 8}
              y={toY(value) + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[11px]"
            >
              {formatNumber(value, 1)}
            </text>
          </g>
        ))}
        {tTicks.map((value) => (
          <text
            key={value}
            x={toX(value)}
            y={HEIGHT - 12}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            {formatNumber(value, 1)}
          </text>
        ))}

        <polyline
          points={exactCurve}
          fill="none"
          className="stroke-tone"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <polyline
          points={eulerLine}
          fill="none"
          className="stroke-accent"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {steps <= 24
          ? points.map((p) => (
              <circle
                key={p.t}
                cx={toX(p.t)}
                cy={toY(p.y)}
                r="4"
                className="fill-accent stroke-card"
                strokeWidth="1.5"
              />
            ))
          : null}
        {/* The gap at the end is the error. */}
        <line
          x1={toX(problem.tEnd)}
          x2={toX(problem.tEnd)}
          y1={toY(eulerEnd)}
          y2={toY(exactEnd)}
          className="stroke-danger"
          strokeWidth="3"
          strokeDasharray="4 3"
        />
      </svg>

      <div className="space-y-4 border-t p-4 sm:p-5">
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="h-1 w-6 rounded-full bg-tone" />
            {t("exact")}
          </span>
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-1 w-6 rounded-full bg-accent"
            />
            {t("euler")}
          </span>
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-1 w-6 rounded-full bg-danger"
            />
            {t("gap")}
          </span>
        </p>

        {goal ? (
          <GoalBanner reached={reached}>
            {reached
              ? t("goalReached", { steps })
              : t("goal", { maxError: formatNumber(goal.maxError, 3) })}
          </GoalBanner>
        ) : null}

        <Slider
          label={t("steps")}
          valueText={String(steps)}
          value={steps}
          min={1}
          max={MAX_STEPS}
          step={1}
          onChange={setSteps}
        />

        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          <Readout
            label={t("stepSize")}
            value={formatNumber(problem.tEnd / steps, 3)}
          />
          <Readout label={t("eulerEnd")} value={formatNumber(eulerEnd, 3)} />
          <Readout
            label={t("error")}
            testId="euler-error"
            highlight
            value={formatNumber(error, 3)}
          />
        </dl>
        <p className="sr-only" aria-live="polite">
          {t("live", {
            steps,
            error: formatNumber(error, 3),
          })}
        </p>
      </div>
    </div>
  );
}
