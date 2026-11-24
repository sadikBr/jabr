"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import type { InteractiveProps } from "@/lib/content/interactive-specs";
import { formatNumber } from "@/lib/maths/functions";
import { snap } from "@/lib/maths/plot";
import {
  add,
  angleBetween,
  fromPolar,
  type Polar,
  subtract,
  toPolar,
  type Vec,
} from "@/lib/maths/vectors";

import { GoalBanner, Readout, Slider, Toggle, useGoal } from "./parts";
import { Arrow, LegendItem, Plot } from "./plot";

const MAX_A = 5;
const MAX_B = 3;
const ZERO: Vec = { x: 0, y: 0 };

/** A drag gives exact coordinates; keep them to tidy values the sliders can show. */
function tidy(v: Vec, max: number): Polar {
  const polar = toPolar(v);
  return {
    magnitude: Math.min(snap(polar.magnitude, 0.1), max),
    angle: snap(polar.angle, 1) % 360,
  };
}

/**
 * Vectors as arrows. In "add" mode two vectors are placed tip to tail and
 * the arrow from the start to the end is their sum. In "components" mode one
 * vector is split into its horizontal and vertical parts.
 */
export function VectorAdd({
  mode,
  a: initialA,
  b: initialB,
  lockB,
  labels,
  unit,
  goal,
}: InteractiveProps<"vector-add">) {
  const t = useTranslations("interactives.vectors");
  const [goalRef, reachGoal] = useGoal("vector-add");
  const [a, setA] = useState<Polar>(initialA);
  const [b, setB] = useState<Polar>(initialB);
  const [showParts, setShowParts] = useState(mode === "components");

  const adding = mode === "add";
  const va = fromPolar(a);
  const vb = adding ? fromPolar(b) : ZERO;
  const sum = add(va, vb);
  const result = toPolar(sum);

  const reached =
    goal !== undefined &&
    ("direction" in goal
      ? result.magnitude > 0.3 &&
        angleBetween(result.angle, goal.direction) <= goal.tolerance
      : Math.abs(sum.x - goal.x) <= goal.tolerance &&
        Math.abs(sum.y - goal.y) <= goal.tolerance);
  useEffect(() => {
    if (reached) reachGoal();
  }, [reached, reachGoal]);

  // A drag moves the tip that was nearer when it began.
  const grabbed = useRef<"a" | "b">("a");
  const onDrag = (x: number, y: number, phase: "start" | "move") => {
    const pointer = { x, y };
    if (phase === "start") {
      const toA = Math.hypot(x - va.x, y - va.y);
      const toSum = Math.hypot(x - sum.x, y - sum.y);
      grabbed.current = adding && !lockB && toSum < toA ? "b" : "a";
    }
    if (grabbed.current === "a") setA(tidy(pointer, MAX_A));
    else setB(tidy(subtract(pointer, va), MAX_B));
  };

  const withUnit = (value: number, digits = 2) =>
    unit
      ? `${formatNumber(value, digits)} ${unit}`
      : formatNumber(value, digits);
  const degrees = (value: number) => `${formatNumber(value, 0)}°`;
  const name = (key: "a" | "b" | "sum") => t(`${labels}.${key}`);

  return (
    <div ref={goalRef} data-subject="maths">
      <Plot
        x={[-7, 7]}
        y={[-1, 1]}
        square
        shape="aspect-square sm:aspect-[3/2]"
        pad={{ left: 30, right: 12, top: 12, bottom: 22 }}
        xTicks={[-6, -4, -2, 0, 2, 4, 6]}
        yTicks={[-6, -4, -2, 0, 2, 4, 6]}
        label={t(adding ? "description" : "componentsDescription", {
          a: `${formatNumber(a.magnitude, 1)} at ${degrees(a.angle)}`,
          b: `${formatNumber(b.magnitude, 1)} at ${degrees(b.angle)}`,
          sum: `${formatNumber(result.magnitude, 2)} at ${degrees(result.angle)}`,
        })}
        onDrag={onDrag}
        testId="vector-plot"
        overlay={({ scale }) => {
          const at = (v: Vec) => ({ x: scale.toX(v.x), y: scale.toY(v.y) });
          const origin = at(ZERO);
          return (
            <>
              {goal && "direction" in goal ? (
                // The way the result has to point.
                <Arrow
                  from={origin}
                  to={at(fromPolar({ magnitude: 7, angle: goal.direction }))}
                  className="text-success/40"
                  width={8}
                />
              ) : null}
              {goal && "x" in goal ? (
                <circle
                  cx={scale.toX(goal.x)}
                  cy={scale.toY(goal.y)}
                  r="10"
                  className="fill-success/25 stroke-success"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />
              ) : null}
              {showParts ? (
                <>
                  <Arrow
                    from={origin}
                    to={at({ x: sum.x, y: 0 })}
                    className="text-muted-foreground"
                    width={2.5}
                    dashed
                  />
                  <Arrow
                    from={at({ x: sum.x, y: 0 })}
                    to={at(sum)}
                    className="text-muted-foreground"
                    width={2.5}
                    dashed
                  />
                </>
              ) : null}
              {adding ? (
                <>
                  <Arrow from={origin} to={at(va)} className="text-tone" />
                  <Arrow from={at(va)} to={at(sum)} className="text-danger" />
                  <Arrow
                    from={origin}
                    to={at(sum)}
                    className="text-accent"
                    width={4.5}
                  />
                </>
              ) : (
                <Arrow
                  from={origin}
                  to={at(va)}
                  className="text-tone"
                  width={4.5}
                />
              )}
            </>
          );
        }}
      />

      <div className="space-y-4 border-t p-4 sm:p-5">
        {goal ? (
          <GoalBanner reached={reached}>
            {reached
              ? adding
                ? t(`${labels}.goalReached`, {
                    sum: withUnit(result.magnitude),
                    angle: degrees(a.angle),
                  })
                : t("componentsReached", { sum: withUnit(result.magnitude) })
              : "direction" in goal
                ? t(`${labels}.goalDirection`, {
                    direction: degrees(goal.direction),
                  })
                : t("goalComponents", {
                    x: formatNumber(goal.x, 1),
                    y: formatNumber(goal.y, 1),
                  })}
          </GoalBanner>
        ) : null}

        <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium">
          <LegendItem className="bg-tone">{name("a")}</LegendItem>
          {adding ? (
            <>
              <LegendItem className="bg-danger">{name("b")}</LegendItem>
              <LegendItem className="bg-accent">{name("sum")}</LegendItem>
            </>
          ) : null}
        </p>

        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Slider
            label={t("size", { name: name("a") })}
            valueText={withUnit(a.magnitude, 1)}
            value={a.magnitude}
            min={0}
            max={MAX_A}
            step={0.1}
            onChange={(magnitude) => setA({ ...a, magnitude })}
          />
          <Slider
            label={t("direction", { name: name("a") })}
            valueText={degrees(a.angle)}
            value={a.angle}
            min={0}
            max={359}
            step={1}
            onChange={(angle) => setA({ ...a, angle })}
          />
          {adding && !lockB ? (
            <>
              <Slider
                label={t("size", { name: name("b") })}
                valueText={withUnit(b.magnitude, 1)}
                value={b.magnitude}
                min={0}
                max={MAX_B}
                step={0.1}
                onChange={(magnitude) => setB({ ...b, magnitude })}
              />
              <Slider
                label={t("direction", { name: name("b") })}
                valueText={degrees(b.angle)}
                value={b.angle}
                min={0}
                max={359}
                step={1}
                onChange={(angle) => setB({ ...b, angle })}
              />
            </>
          ) : null}
        </div>

        {adding ? (
          <Toggle
            label={t("showParts")}
            checked={showParts}
            onChange={setShowParts}
          />
        ) : null}

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <Readout
            label={adding ? t(`${labels}.size`) : t("sizeOfA")}
            testId="vector-size"
            highlight
            value={formatNumber(result.magnitude, 2)}
            unit={unit}
          />
          <Readout
            label={t("resultDirection")}
            testId="vector-direction"
            value={degrees(result.angle)}
          />
          <Readout
            label={t("partX")}
            testId="vector-x"
            value={formatNumber(sum.x, 2)}
            unit={unit}
          />
          <Readout
            label={t("partY")}
            testId="vector-y"
            value={formatNumber(sum.y, 2)}
            unit={unit}
          />
        </dl>
        <p className="text-sm text-muted-foreground">{t("drag")}</p>
        <p className="sr-only" aria-live="polite">
          {t("live", {
            size: formatNumber(result.magnitude, 2),
            direction: degrees(result.angle),
          })}
        </p>
      </div>
    </div>
  );
}
