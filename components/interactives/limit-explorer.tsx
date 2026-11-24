"use client";

import { Check, RotateCcw, X, ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Html } from "@/components/questions/html";
import { Button } from "@/components/ui/button";
import type { InteractiveProps } from "@/lib/content/interactive-specs";
import { formatNumber } from "@/lib/maths/functions";
import {
  distanceAt,
  isContinuous,
  type LimitCase,
  type LimitCaseId,
  limitCases,
  twoSidedLimit,
} from "@/lib/maths/limits";
import { curveSegments } from "@/lib/maths/plot";
import { cn } from "@/lib/utils";

import { Segmented, Slider, useGoal } from "./parts";
import { Curve, Dot, Plot } from "./plot";

const MAX_POSITION = 5; // a distance of 0.00001
/** The verdict appears once the learner is this close: 0.001 away. */
const CLOSE_ENOUGH = 3;
const TABLE_ROWS = [0, 1, 2, 3, 4];

/** Values this close to the point need more decimals to tell apart. */
function valueText(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return Math.abs(value) >= 1000
    ? formatNumber(value, 0)
    : formatNumber(value, 6);
}

/**
 * Close in on a point from both sides and watch what the function's values
 * do. The limit is where they are heading, which need not be the value at
 * the point: there may be no value there at all. In "continuity" mode the
 * three-part test for continuity is checked off as well.
 */
export function LimitExplorer({
  cases,
  mode,
  texHtml = {},
}: InteractiveProps<"limit-explorer"> & {
  texHtml?: Partial<Record<LimitCaseId, string>>;
}) {
  const t = useTranslations("interactives.limit");
  const [goalRef, reachGoal] = useGoal("limit-explorer");
  const [caseId, setCaseId] = useState<LimitCaseId>(cases[0]!);
  const [position, setPosition] = useState(0);
  // How close the learner has come in each case, to know when all are seen.
  const [closest, setClosest] = useState<Partial<Record<LimitCaseId, number>>>(
    {},
  );

  const current: LimitCase = limitCases[caseId];
  const { a, f } = current;
  const d = distanceAt(position);
  const reachedPosition = Math.max(closest[caseId] ?? 0, position);
  const closedIn = reachedPosition >= CLOSE_ENOUGH;
  const limit = twoSidedLimit(current);

  const approach = (next: number) => {
    setPosition(next);
    setClosest((seen) => ({
      ...seen,
      [caseId]: Math.max(seen[caseId] ?? 0, next),
    }));
  };
  const allSeen = cases.every((id) => (closest[id] ?? 0) >= CLOSE_ENOUGH);
  useEffect(() => {
    if (allSeen) reachGoal();
  }, [allSeen, reachGoal]);

  const aText = formatNumber(a, 2);
  const sides = [
    { key: "left", x: a - d, y: f(a - d) },
    { key: "right", x: a + d, y: f(a + d) },
  ] as const;
  const inView = (y: number) => y >= current.y[0] && y <= current.y[1];

  // Where the graph has a gap (drawn hollow) and where its value is (solid).
  const hollow = [
    ...new Set(
      [current.left, current.right].filter(
        (y): y is number => y !== null && y !== current.value,
      ),
    ),
  ];

  const verdict = t(`verdict.${current.kind}`, {
    a: aText,
    limit: limit === null ? "" : formatNumber(limit, 2),
    left: current.left === null ? "" : formatNumber(current.left, 2),
    right: current.right === null ? "" : formatNumber(current.right, 2),
    value: current.value === null ? "" : formatNumber(current.value, 2),
  });
  const tests = [
    { key: "defined", passed: current.value !== null },
    { key: "limit", passed: limit !== null },
    { key: "equal", passed: isContinuous(current) },
  ] as const;

  return (
    <div ref={goalRef} data-subject="maths">
      {cases.length > 1 ? (
        <div className="overflow-x-auto border-b px-4 py-3 sm:px-5">
          <Segmented
            label={t("choose")}
            value={caseId}
            options={cases.map((id) => ({
              value: id,
              label: t(`cases.${id}`),
            }))}
            onChange={(id) => {
              setCaseId(id);
              setPosition(0);
            }}
          />
        </div>
      ) : null}
      {texHtml[caseId] ? (
        <Html
          html={texHtml[caseId]}
          className="border-b px-4 py-3 text-center text-sm sm:px-5"
        />
      ) : null}

      <Plot
        x={current.x}
        y={current.y}
        label={t("description", { a: aText, d: formatNumber(d, 5) })}
        overlay={({ scale }) => (
          <>
            {sides.map((side) =>
              inView(side.y) ? (
                <Dot
                  key={side.key}
                  x={scale.toX(side.x)}
                  y={scale.toY(side.y)}
                />
              ) : null,
            )}
            {/* On top, so a gap stays visible as the markers close in. */}
            {hollow.map((y) => (
              <Dot
                key={y}
                x={scale.toX(a)}
                y={scale.toY(y)}
                size={6}
                className="fill-background stroke-tone"
              />
            ))}
            {current.value !== null ? (
              <Dot
                x={scale.toX(a)}
                y={scale.toY(current.value)}
                size={6}
                className="fill-tone stroke-card"
              />
            ) : null}
          </>
        )}
      >
        {({ scale, frame }) => (
          <>
            <line
              x1={scale.toX(a)}
              x2={scale.toX(a)}
              y1={frame.pad.top}
              y2={frame.height - frame.pad.bottom}
              className="stroke-muted-foreground"
              strokeDasharray="3 5"
            />
            <Curve
              segments={curveSegments(f, frame, {
                samples: current.kind === "oscillating" ? 2400 : 320,
                breaks: [a],
              })}
              width={current.kind === "oscillating" ? 1.5 : 3.5}
            />
            {/* Each side's distance from the point, and its height. */}
            <g className="stroke-accent" strokeWidth="2" strokeDasharray="4 4">
              {sides.map((side) =>
                inView(side.y) ? (
                  <line
                    key={side.key}
                    x1={scale.toX(side.x)}
                    x2={scale.toX(side.x)}
                    y1={scale.toY(Math.max(current.y[0], 0))}
                    y2={scale.toY(side.y)}
                  />
                ) : null,
              )}
            </g>
          </>
        )}
      </Plot>

      <div className="space-y-4 border-t p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Slider
            label={t("distance", { a: aText })}
            valueText={formatNumber(d, 5)}
            value={position}
            min={0}
            max={MAX_POSITION}
            step={0.25}
            onChange={approach}
          />
          <div className="flex gap-2">
            <Button
              onClick={() =>
                approach(Math.min(Math.floor(position) + 1, MAX_POSITION))
              }
              disabled={position >= MAX_POSITION}
              className="flex-1 sm:flex-none"
            >
              <ZoomIn aria-hidden="true" />
              {t("closer")}
            </Button>
            <Button variant="outline" onClick={() => setPosition(0)}>
              <RotateCcw aria-hidden="true" />
              {t("reset")}
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm tabular-nums">
            <caption className="sr-only">
              {t("tableCaption", { a: aText })}
            </caption>
            <thead className="bg-muted text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  {t("columns.distance")}
                </th>
                <th scope="col" className="px-3 py-2 text-end font-medium">
                  {t("columns.left", { a: aText })}
                </th>
                <th scope="col" className="px-3 py-2 text-end font-medium">
                  {t("columns.right", { a: aText })}
                </th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {TABLE_ROWS.map((row) => {
                const shown = reachedPosition >= row;
                const gap = distanceAt(row);
                return (
                  <tr
                    key={row}
                    className={cn(
                      "border-t",
                      !shown && "text-muted-foreground/60",
                    )}
                  >
                    <th
                      scope="row"
                      className="px-3 py-1.5 text-start font-normal"
                    >
                      {formatNumber(gap, 5)}
                    </th>
                    <td className="px-3 py-1.5 text-end">
                      {shown ? valueText(f(a - gap)) : "?"}
                    </td>
                    <td className="px-3 py-1.5 text-end">
                      {shown ? valueText(f(a + gap)) : "?"}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t bg-accent/15 font-semibold">
                <th
                  scope="row"
                  className="px-3 py-1.5 text-start font-sans font-semibold"
                >
                  {t("atPoint", { a: aText })}
                </th>
                <td
                  colSpan={2}
                  className="px-3 py-1.5 text-end"
                  data-testid="limit-value-at-point"
                >
                  {current.value === null
                    ? t("undefined")
                    : formatNumber(current.value, 2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {closedIn ? (
          <div
            className="animate-rise-in space-y-3"
            data-testid="limit-verdict"
          >
            <p className="rounded-xl bg-tone-soft px-4 py-3 text-sm font-medium text-tone">
              {verdict}
            </p>
            {mode === "continuity" ? (
              <div className="rounded-xl border p-4">
                <ul className="space-y-1.5 text-sm">
                  {tests.map((test) => (
                    <li key={test.key} className="flex items-center gap-2">
                      {test.passed ? (
                        <Check
                          aria-hidden="true"
                          className="size-4 shrink-0 text-success"
                        />
                      ) : (
                        <X
                          aria-hidden="true"
                          className="size-4 shrink-0 text-danger"
                        />
                      )}
                      <span className="sr-only">
                        {t(test.passed ? "yes" : "no")}
                      </span>
                      {t(`tests.${test.key}`, { a: aText })}
                    </li>
                  ))}
                </ul>
                <p
                  className={cn(
                    "mt-3 font-semibold",
                    isContinuous(current) ? "text-success" : "text-danger",
                  )}
                >
                  {t(isContinuous(current) ? "continuous" : "notContinuous", {
                    a: aText,
                  })}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t(mode === "continuity" ? "promptContinuity" : "prompt", {
              a: aText,
            })}
          </p>
        )}
        <p className="sr-only" aria-live="polite">
          {t("live", {
            d: formatNumber(d, 5),
            left: valueText(f(a - d)),
            right: valueText(f(a + d)),
          })}
        </p>
      </div>
    </div>
  );
}
