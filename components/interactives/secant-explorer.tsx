"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import type { InteractiveProps } from "@/lib/content/interactive-specs";
import { datasets, slopeBetween } from "@/lib/maths/datasets";
import { formatNumber, functionDefinitions } from "@/lib/maths/functions";
import { clamp, curveSegments, snap } from "@/lib/maths/plot";

import { GoalBanner, Readout, Slider, useGoal } from "./parts";
import { Curve, Dot, Plot } from "./plot";

/** Below this many pixels apart, the triangle is too small to label. */
const LABEL_ROOM = 64;

function nearestIndex(points: readonly { x: number }[], x: number): number {
  let best = 0;
  points.forEach((point, index) => {
    if (Math.abs(point.x - x) < Math.abs(points[best]!.x - x)) best = index;
  });
  return best;
}

/**
 * Two points on a graph and the straight line through them. Its slope is the
 * average rate of change between the points: the rise divided by the run.
 * Works on a function or on measured data, where the points sit on readings.
 */
export function SecantExplorer({
  dataset,
  fn,
  domain,
  step,
  a,
  b,
  units,
  labels,
  goal,
}: InteractiveProps<"secant-explorer">) {
  const t = useTranslations("interactives.secant");
  const [goalRef, reachGoal] = useGoal("secant-explorer");
  const data = dataset ? datasets[dataset] : null;
  const shownUnits = units ?? data?.units;

  // Every place a point may sit: the readings, or a fine grid on the curve.
  const { f } = functionDefinitions[fn];
  const points = data
    ? data.points
    : Array.from(
        { length: Math.round((domain[1] - domain[0]) / step) + 1 },
        (_, i) => {
          const x = snap(domain[0] + i * step, step);
          return { x, y: f(x) };
        },
      );
  const last = points.length - 1;

  const [[from, to], setPair] = useState<[number, number]>(() => {
    const start = clamp(nearestIndex(points, a), 0, last - 1);
    return [start, clamp(nearestIndex(points, b), start + 1, last)];
  });
  const moveFrom = (index: number) =>
    setPair(([, end]) => [clamp(index, 0, end - 1), end]);
  const moveTo = (index: number) =>
    setPair(([start]) => [start, clamp(index, start + 1, last)]);

  const p = points[from]!;
  const q = points[to]!;
  const slope = slopeBetween(p, q);
  const reached = goal !== undefined && slope >= goal.min;
  useEffect(() => {
    if (reached) reachGoal();
  }, [reached, reachGoal]);

  // A little room around the data, so points at the ends are easy to grab.
  const xSpan = points[last]!.x - points[0]!.x;
  const xRange = [
    points[0]!.x - xSpan * 0.04,
    points[last]!.x + xSpan * 0.04,
  ] as const;
  const ys = points.map((point) => point.y);
  const yTop = Math.max(...ys);
  const yBottom = Math.min(0, ...ys);
  const yRange = [
    yBottom - (yTop - yBottom) * 0.04,
    yTop + (yTop - yBottom) * 0.08,
  ] as const;
  const secantAt = (x: number) => p.y + slope * (x - p.x);

  // A drag moves whichever point was nearer when it began.
  const grabbed = useRef<"from" | "to">("to");
  const onDrag = (x: number, _y: number, phase: "start" | "move") => {
    if (phase === "start") {
      grabbed.current = Math.abs(x - p.x) <= Math.abs(x - q.x) ? "from" : "to";
    }
    const index = nearestIndex(points, x);
    if (grabbed.current === "from") moveFrom(index);
    else moveTo(index);
  };

  const unit = (value: string, of?: string) => (of ? `${value} ${of}` : value);
  const rateUnit = shownUnits ? `${shownUnits.y}/${shownUnits.x}` : undefined;
  const xText = (x: number) => unit(formatNumber(x, 2), shownUnits?.x);
  const yText = (y: number) => unit(formatNumber(y, 2), shownUnits?.y);
  const slopeText = unit(formatNumber(slope, 2), rateUnit);
  const pointText = (point: { x: number; y: number }) =>
    data
      ? t("reading", { x: xText(point.x), y: yText(point.y) })
      : xText(point.x);

  return (
    <div ref={goalRef} data-subject="maths">
      <Plot
        x={xRange}
        y={yRange}
        label={t("description", { from: xText(p.x), to: xText(q.x) })}
        xLabel={shownUnits?.x}
        yLabel={shownUnits?.y}
        onDrag={onDrag}
        overlay={({ scale, frame }) => {
          const px = scale.toX(p.x);
          const qx = scale.toX(q.x);
          const py = scale.toY(p.y);
          const qy = scale.toY(q.y);
          // The run is labelled under its line, unless the axis is in the way.
          const below = py + 16 < frame.height - frame.pad.bottom;
          const nearRight = qx > frame.width - 70;
          return (
            <>
              {qx - px >= LABEL_ROOM ? (
                <text
                  x={(px + qx) / 2}
                  y={below ? py + 16 : py - 8}
                  textAnchor="middle"
                  className="fill-foreground text-[12px] font-semibold"
                >
                  {formatNumber(q.x - p.x, 2)}
                </text>
              ) : null}
              {Math.abs(qy - py) >= LABEL_ROOM / 2 ? (
                <text
                  x={nearRight ? qx - 8 : qx + 8}
                  y={(py + qy) / 2 + 4}
                  textAnchor={nearRight ? "end" : "start"}
                  className="fill-foreground text-[12px] font-semibold"
                >
                  {formatNumber(q.y - p.y, 2)}
                </text>
              ) : null}
              <Dot x={px} y={py} size={8} />
              <Dot x={qx} y={qy} size={8} />
            </>
          );
        }}
      >
        {({ scale, frame }) => (
          <>
            {data ? (
              <>
                <polyline
                  points={points
                    .map(
                      (point) => `${scale.toX(point.x)},${scale.toY(point.y)}`,
                    )
                    .join(" ")}
                  fill="none"
                  className="stroke-tone/40"
                  strokeWidth="2"
                />
                {points.map((point) => (
                  <circle
                    key={point.x}
                    cx={scale.toX(point.x)}
                    cy={scale.toY(point.y)}
                    r="4.5"
                    className="fill-tone"
                  />
                ))}
              </>
            ) : (
              <Curve
                segments={curveSegments(f, frame, {
                  from: points[0]!.x,
                  to: points[last]!.x,
                })}
                width={3.5}
              />
            )}

            {/* The run and the rise: the two sides of the slope triangle. */}
            <g
              className="stroke-muted-foreground"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            >
              <line
                x1={scale.toX(p.x)}
                x2={scale.toX(q.x)}
                y1={scale.toY(p.y)}
                y2={scale.toY(p.y)}
              />
              <line
                x1={scale.toX(q.x)}
                x2={scale.toX(q.x)}
                y1={scale.toY(p.y)}
                y2={scale.toY(q.y)}
              />
            </g>
            <line
              x1={scale.toX(xRange[0])}
              x2={scale.toX(xRange[1])}
              y1={scale.toY(secantAt(xRange[0]))}
              y2={scale.toY(secantAt(xRange[1]))}
              className="stroke-accent"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        )}
      </Plot>

      <div className="space-y-4 border-t p-4 sm:p-5">
        {goal ? (
          <GoalBanner reached={reached}>
            {reached
              ? t("goalReached", {
                  slope: slopeText,
                  from: xText(p.x),
                  to: xText(q.x),
                })
              : t(`${labels}.goal`, {
                  min: unit(formatNumber(goal.min, 2), rateUnit),
                })}
          </GoalBanner>
        ) : null}

        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Slider
            label={t(`${labels}.from`)}
            valueText={pointText(p)}
            value={from}
            min={0}
            max={last - 1}
            step={1}
            onChange={moveFrom}
          />
          <Slider
            label={t(`${labels}.to`)}
            valueText={pointText(q)}
            value={to}
            min={1}
            max={last}
            step={1}
            onChange={moveTo}
          />
        </div>

        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          <Readout
            label={t(`${labels}.run`)}
            value={formatNumber(q.x - p.x, 2)}
            unit={shownUnits?.x}
          />
          <Readout
            label={t(`${labels}.rise`)}
            value={formatNumber(q.y - p.y, 2)}
            unit={shownUnits?.y}
          />
          <Readout
            label={t(`${labels}.slope`)}
            testId="secant-explorer-slope"
            highlight
            value={formatNumber(slope, 2)}
            unit={rateUnit}
          />
        </dl>
        <p className="text-sm text-muted-foreground">{t("drag")}</p>
        <p className="sr-only" aria-live="polite">
          {t("live", { from: xText(p.x), to: xText(q.x), slope: slopeText })}
        </p>
      </div>
    </div>
  );
}
