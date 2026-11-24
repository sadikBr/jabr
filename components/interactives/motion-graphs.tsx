"use client";

import { Play, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { InteractiveProps } from "@/lib/content/interactive-specs";
import { formatNumber } from "@/lib/maths/functions";
import { curveSegments, snap } from "@/lib/maths/plot";
import {
  acceleration,
  flightTime,
  height,
  peakHeight,
  peakTime,
  velocity,
} from "@/lib/sim/motion";

import { GoalBanner, Readout, Slider, useGoal, usePlayback } from "./parts";
import { Curve, Dot, Plot, type PlotView } from "./plot";

/** Room on the right of the height graph for the ball itself. */
const TRACK = 44;
const TIME_STEP = 0.01;
/** How close to zero the velocity must be to count as "the top", in m/s. */
const AT_REST = 0.5;

/**
 * A ball thrown straight up, shown three ways at once: its height, its
 * velocity and its acceleration against time. The slope of each graph is
 * the value of the one below it.
 */
export function MotionGraphs({
  speed: initialSpeed,
  goal,
}: InteractiveProps<"motion-graphs">) {
  const t = useTranslations("interactives.motion");
  const [goalRef, reachGoal] = useGoal("motion-graphs");
  const [speed, setSpeed] = useState(initialSpeed);
  const [scrubbed, setScrubbed] = useState(0);

  // 9.8 rather than 9.81, to match h = v₀t − 4.9t² as the lessons write it.
  const thrown = { speed, gravity: 9.8 };
  const duration = flightTime(thrown);
  const playback = usePlayback(duration);
  const time = Math.min(playback.time ?? scrubbed, duration);
  const scrub = (value: number) => {
    playback.reset();
    setScrubbed(Math.min(value, duration));
  };

  const h = height(thrown, time);
  const v = velocity(thrown, time);
  const a = acceleration(thrown);
  const top = peakHeight(thrown);

  const reached =
    goal === "peak" && !playback.playing && Math.abs(v) <= AT_REST;
  useEffect(() => {
    if (reached) reachGoal();
  }, [reached, reachGoal]);

  const pad = { right: 16 + TRACK };
  const onDrag = (x: number) => scrub(snap(x, TIME_STEP));
  const xRange = [0, duration] as const;
  const heightRange = [0, top * 1.15] as const;
  const velocityRange = [-speed * 1.2, speed * 1.2] as const;
  // The tangent to the height graph: its slope is the velocity right now.
  const reach = duration * 0.16;
  const cursor = ({ scale, frame }: PlotView) => (
    <line
      x1={scale.toX(time)}
      x2={scale.toX(time)}
      y1={frame.pad.top}
      y2={frame.height - frame.pad.bottom}
      className="stroke-muted-foreground"
      strokeDasharray="3 5"
    />
  );
  const seconds = (value: number) => `${formatNumber(value, 2)} s`;

  return (
    <div ref={goalRef} data-subject="physics">
      <Plot
        x={xRange}
        y={heightRange}
        shape="aspect-[16/9] sm:aspect-[5/2]"
        pad={pad}
        label={t("heightDescription", {
          speed,
          time: formatNumber(time, 2),
          height: formatNumber(h, 1),
        })}
        yLabel={t("heightAxis")}
        onDrag={onDrag}
        overlay={({ scale, frame }) => {
          // The ball itself, rising and falling beside its graph.
          const trackX = frame.width - 16 - TRACK / 2;
          return (
            <>
              <Dot x={scale.toX(time)} y={scale.toY(h)} />
              <line
                x1={trackX}
                x2={trackX}
                y1={scale.toY(top)}
                y2={scale.toY(0)}
                className="stroke-border"
                strokeWidth="2"
                strokeDasharray="2 4"
              />
              <line
                x1={trackX - 14}
                x2={trackX + 14}
                y1={scale.toY(0) + 10}
                y2={scale.toY(0) + 10}
                className="stroke-muted-foreground"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <Dot
                x={trackX}
                y={scale.toY(h)}
                size={9}
                className="fill-tone stroke-card"
                testId="motion-ball"
              />
            </>
          );
        }}
      >
        {(view) => (
          <>
            <Curve
              segments={curveSegments((x) => height(thrown, x), view.frame)}
              width={3.5}
            />
            <line
              x1={view.scale.toX(time - reach)}
              x2={view.scale.toX(time + reach)}
              y1={view.scale.toY(h - v * reach)}
              y2={view.scale.toY(h + v * reach)}
              className="stroke-accent"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {cursor(view)}
          </>
        )}
      </Plot>

      <Plot
        x={xRange}
        y={velocityRange}
        shape="aspect-[2/1] sm:aspect-[3/1]"
        pad={pad}
        label={t("velocityDescription", { velocity: formatNumber(v, 1) })}
        yLabel={t("velocityAxis")}
        onDrag={onDrag}
        className="border-t"
        overlay={({ scale }) => <Dot x={scale.toX(time)} y={scale.toY(v)} />}
      >
        {(view) => (
          <>
            <Curve
              segments={curveSegments((x) => velocity(thrown, x), view.frame)}
              width={3.5}
            />
            {cursor(view)}
          </>
        )}
      </Plot>

      <Plot
        x={xRange}
        y={[-15, 5]}
        shape="aspect-[5/2] sm:aspect-[4/1]"
        pad={pad}
        label={t("accelerationDescription", {
          acceleration: formatNumber(a, 2),
        })}
        yTicks={[-10, 0]}
        yLabel={t("accelerationAxis")}
        xLabel={t("timeAxis")}
        onDrag={onDrag}
        className="border-t"
        overlay={({ scale }) => <Dot x={scale.toX(time)} y={scale.toY(a)} />}
      >
        {(view) => (
          <>
            <Curve segments={curveSegments(() => a, view.frame)} width={3.5} />
            {cursor(view)}
          </>
        )}
      </Plot>

      <div className="space-y-4 border-t p-4 sm:p-5">
        {goal === "peak" ? (
          <GoalBanner reached={reached}>
            {reached
              ? t("goalReached", { acceleration: formatNumber(a, 2) })
              : t("goal")}
          </GoalBanner>
        ) : null}

        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Slider
            label={t("time")}
            valueText={seconds(time)}
            value={Number(time.toFixed(2))}
            min={0}
            max={Number(duration.toFixed(2))}
            step={TIME_STEP}
            onChange={scrub}
          />
          <Slider
            label={t("speed")}
            valueText={`${speed} m/s`}
            value={speed}
            min={5}
            max={25}
            step={1}
            onChange={(value) => {
              playback.reset();
              setScrubbed(0);
              setSpeed(value);
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => playback.play(() => setScrubbed(duration))}
            disabled={playback.playing}
            className="flex-1 sm:flex-none"
          >
            <Play aria-hidden="true" />
            {t("throw")}
          </Button>
          <Button variant="outline" onClick={() => scrub(0)}>
            <RotateCcw aria-hidden="true" />
            {t("reset")}
          </Button>
          <Button
            variant="outline"
            onClick={() => scrub(snap(peakTime(thrown), TIME_STEP))}
            className={goal === "peak" ? "hidden" : undefined}
          >
            {t("jumpToTop")}
          </Button>
        </div>

        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          <Readout
            label={t("height")}
            testId="motion-height"
            value={formatNumber(h, 2)}
            unit="m"
          />
          <Readout
            label={t("velocity")}
            testId="motion-velocity"
            highlight
            value={formatNumber(v, 2)}
            unit="m/s"
          />
          <Readout
            label={t("acceleration")}
            value={formatNumber(a, 2)}
            unit="m/s²"
          />
        </dl>
        <p className="sr-only" aria-live="polite">
          {playback.playing
            ? ""
            : t("live", {
                time: formatNumber(time, 2),
                height: formatNumber(h, 1),
                velocity: formatNumber(v, 1),
              })}
        </p>
      </div>
    </div>
  );
}
