"use client";

import { Eraser } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { InteractiveProps } from "@/lib/content/interactive-specs";
import {
  formatNumber,
  functionDefinitions,
  type PlottableFunction,
} from "@/lib/maths/functions";
import { clamp, curveSegments } from "@/lib/maths/plot";

import { GoalBanner, Readout, Segmented, Slider, useGoal } from "./parts";
import { Curve, Dot, LegendItem, Plot } from "./plot";

/** The point moves across this many positions, and each can be traced. */
const POSITIONS = 120;

/** Runs of neighbouring traced positions, as [first, last] index pairs. */
function tracedRuns(traced: readonly boolean[]): [number, number][] {
  const runs: [number, number][] = [];
  let start: number | null = null;
  traced.forEach((on, index) => {
    if (on && start === null) start = index;
    if (start !== null && (!on || index === traced.length - 1)) {
      runs.push([start, on ? index : index - 1]);
      start = null;
    }
  });
  return runs;
}

/**
 * Slide a point along a curve. The tangent there has a slope; plotting that
 * slope against x, one point at a time, draws the derivative. Sweep the
 * whole curve and its derivative appears as a graph of its own.
 */
export function DerivativeExplorer({
  fns,
}: InteractiveProps<"derivative-explorer">) {
  const t = useTranslations("interactives.derivative");
  const [goalRef, reachGoal] = useGoal("derivative-explorer");
  const [fn, setFn] = useState<PlottableFunction>(fns[0]!);
  const [index, setIndex] = useState(Math.round(POSITIONS * 0.7));
  const [traces, setTraces] = useState<
    Partial<Record<PlottableFunction, boolean[]>>
  >({});

  const { f, derivative, view, label, derivativeLabel } =
    functionDefinitions[fn];
  const [xMin, xMax] = view.x;
  const xAt = (i: number) => xMin + ((xMax - xMin) * i) / POSITIONS;
  const x = xAt(index);
  const y = f(x);
  const slope = derivative(x);

  const traced = traces[fn] ?? [];
  const tracedCount = traced.filter(Boolean).length;
  const percent = Math.round((tracedCount / (POSITIONS + 1)) * 100);
  const complete = tracedCount === POSITIONS + 1;
  const allComplete = fns.every(
    (id) => (traces[id] ?? []).filter(Boolean).length === POSITIONS + 1,
  );
  useEffect(() => {
    if (allComplete) reachGoal();
  }, [allComplete, reachGoal]);

  /** Moves the point, tracing every position passed on the way. */
  const moveTo = (next: number) => {
    const target = clamp(Math.round(next), 0, POSITIONS);
    setTraces((all) => {
      const updated = [
        ...(all[fn] ?? Array<boolean>(POSITIONS + 1).fill(false)),
      ];
      for (let i = Math.min(index, target); i <= Math.max(index, target); i++) {
        updated[i] = true;
      }
      return { ...all, [fn]: updated };
    });
    setIndex(target);
  };
  const onDrag = (dragX: number) =>
    moveTo(((dragX - xMin) / (xMax - xMin)) * POSITIONS);

  const tangentAt = (value: number) => y + slope * (value - x);
  const steep = Number.isFinite(slope);

  return (
    <div ref={goalRef} data-subject="maths">
      {fns.length > 1 ? (
        <div className="overflow-x-auto border-b px-4 py-3 sm:px-5">
          <Segmented
            label={t("choose")}
            value={fn}
            options={fns.map((id) => ({
              value: id,
              label: `f(x) = ${functionDefinitions[id].label}`,
            }))}
            onChange={setFn}
          />
        </div>
      ) : null}

      <Plot
        x={view.x}
        y={view.y}
        shape="aspect-[3/2] sm:aspect-[5/2]"
        label={t("description", { fn: label, x: formatNumber(x, 2) })}
        yLabel={`f(x) = ${label}`}
        onDrag={onDrag}
        overlay={({ scale }) => (
          <Dot x={scale.toX(x)} y={scale.toY(y)} size={8} />
        )}
      >
        {({ scale, frame }) => (
          <>
            <Curve segments={curveSegments(f, frame)} width={3.5} />
            {steep ? (
              <line
                x1={scale.toX(xMin)}
                x2={scale.toX(xMax)}
                y1={scale.toY(tangentAt(xMin))}
                y2={scale.toY(tangentAt(xMax))}
                className="stroke-accent"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            ) : null}
          </>
        )}
      </Plot>

      <Plot
        x={view.x}
        y={view.slope}
        shape="aspect-[16/9] sm:aspect-[3/1]"
        label={t("slopeDescription", { percent })}
        yLabel={t("slopeAxis")}
        onDrag={onDrag}
        className="border-t"
        testId="derivative-trace"
        overlay={({ scale }) =>
          steep && slope >= view.slope[0] && slope <= view.slope[1] ? (
            <Dot x={scale.toX(x)} y={scale.toY(slope)} />
          ) : null
        }
      >
        {({ scale, frame }) => (
          <>
            {complete ? (
              <Curve
                segments={curveSegments(derivative, frame)}
                className="stroke-success"
                width={7}
              />
            ) : null}
            {tracedRuns(traced).map(([first, lastIndex]) => (
              <Curve
                key={first}
                segments={curveSegments(derivative, frame, {
                  from: xAt(first),
                  // A single traced position still needs some width to be seen.
                  to: xAt(lastIndex === first ? first + 0.5 : lastIndex),
                  samples: Math.max(2, (lastIndex - first) * 2),
                })}
                className="stroke-accent"
                width={3.5}
              />
            ))}
            <line
              x1={scale.toX(x)}
              x2={scale.toX(x)}
              y1={frame.pad.top}
              y2={frame.height - frame.pad.bottom}
              className="stroke-muted-foreground"
              strokeDasharray="3 5"
            />
          </>
        )}
      </Plot>

      <div className="space-y-4 border-t p-4 sm:p-5">
        <GoalBanner reached={complete}>
          {complete
            ? t("complete", { fn: label, derivative: derivativeLabel })
            : t("goal", { percent })}
        </GoalBanner>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Slider
            label={t("point")}
            valueText={formatNumber(x, 2)}
            value={index}
            min={0}
            max={POSITIONS}
            step={1}
            onChange={moveTo}
          />
          <Button
            variant="outline"
            onClick={() => setTraces((all) => ({ ...all, [fn]: undefined }))}
            disabled={tracedCount === 0}
          >
            <Eraser aria-hidden="true" />
            {t("clear")}
          </Button>
        </div>

        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          <Readout label="x" value={formatNumber(x, 2)} />
          <Readout label="f(x)" value={formatNumber(y, 2)} />
          <Readout
            label={t("slope")}
            testId="derivative-slope"
            highlight
            value={steep ? formatNumber(slope, 2) : "—"}
          />
        </dl>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium">
          <LegendItem className="bg-tone">{t("legendCurve")}</LegendItem>
          <LegendItem className="bg-accent">{t("legendTangent")}</LegendItem>
        </p>
        <p className="sr-only" aria-live="polite">
          {t("live", {
            x: formatNumber(x, 2),
            slope: steep ? formatNumber(slope, 2) : "—",
          })}
        </p>
      </div>
    </div>
  );
}
