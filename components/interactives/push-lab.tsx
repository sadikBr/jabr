"use client";

import { Hand, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { InteractiveProps } from "@/lib/content/interactive-specs";
import { formatNumber } from "@/lib/maths/functions";
import { curveSegments } from "@/lib/maths/plot";
import {
  distanceAt,
  pushAcceleration,
  releaseSpeed,
  speedAt,
} from "@/lib/sim/push";

import {
  GoalBanner,
  Readout,
  Segmented,
  Slider,
  useGoal,
  usePlayback,
} from "./parts";
import { Arrow, Curve, Plot } from "./plot";

/** Sliding friction on each surface. Ice is taken to have none. */
const surfaces = { ice: 0, carpet: 0.25 } as const;
type Surface = keyof typeof surfaces;
/** How long the block is followed after the push ends, in s. */
const COAST = 3;

/**
 * Push a block with a steady force, then let go. During the push it speeds
 * up at force ÷ mass. Afterwards, with nothing pushing or dragging on it, it
 * keeps its speed; on carpet, friction slows it down.
 */
export function PushLab({
  mass: initialMass,
  force: initialForce,
  duration: initialDuration,
  surface: initialSurface,
  goal,
}: InteractiveProps<"push-lab">) {
  const t = useTranslations("interactives.push");
  const [goalRef, reachGoal] = useGoal("push-lab");
  const [mass, setMass] = useState(initialMass);
  const [force, setForce] = useState(initialForce);
  const [duration, setDuration] = useState(initialDuration);
  const [surface, setSurface] = useState<Surface>(initialSurface);

  const push = { mass, force, duration, friction: surfaces[surface] };
  const total = duration + COAST;
  const playback = usePlayback(total);
  const time = playback.time ?? 0;
  const ran = playback.time !== null;
  const finished = ran && !playback.playing;
  const pushing = playback.playing && time < duration;

  const acceleration = pushAcceleration(push);
  const released = releaseSpeed(push);
  const reached =
    goal !== undefined &&
    finished &&
    Math.abs(released - goal.speed) <= goal.tolerance;
  useEffect(() => {
    if (reached) reachGoal();
  }, [reached, reachGoal]);

  const change =
    <Value,>(set: (value: Value) => void) =>
    (value: Value) => {
      playback.reset();
      set(value);
    };

  const trackEnd = Math.max(distanceAt(push, total) * 1.15, 6);
  const speedTop = Math.max(released * 1.25, 2);
  const speed = (value: number) => formatNumber(value, 2);

  return (
    <div ref={goalRef} data-subject="physics">
      <Plot
        x={[-trackEnd * 0.16, trackEnd]}
        y={[0, 1]}
        shape="aspect-[5/2] sm:aspect-[4/1]"
        pad={{ left: 8, right: 8, top: 8 }}
        yTicks={[]}
        xLabel={t("distanceAxis")}
        label={t("sceneDescription", { mass, force })}
        overlay={({ scale, frame }) => {
          const ground = frame.height - frame.pad.bottom;
          // A heavier block is drawn bigger.
          const side = 20 + mass * 2.6;
          const front = scale.toX(distanceAt(push, time));
          const middle = ground - side / 2;
          return (
            <>
              <rect
                x={front - side}
                y={ground - side}
                width={side}
                height={side}
                rx="4"
                className="fill-tone"
                data-testid="push-block"
              />
              <text
                x={front - side / 2}
                y={middle + 4}
                textAnchor="middle"
                className="fill-background text-[11px] font-bold"
              >
                {mass} kg
              </text>
              {/* The push, for as long as it lasts (and before the start). */}
              {pushing || !ran ? (
                <Arrow
                  from={{ x: front - side - 8 - force * 3.2, y: middle }}
                  to={{ x: front - side - 4, y: middle }}
                  className="text-accent"
                  width={5}
                />
              ) : null}
            </>
          );
        }}
      />

      <Plot
        x={[0, total]}
        y={[0, speedTop]}
        shape="aspect-[16/9] sm:aspect-[3/1]"
        className="border-t"
        yLabel={t("speedAxis")}
        xLabel={t("timeAxis")}
        label={t("graphDescription")}
        overlay={({ scale }) =>
          ran ? (
            <circle
              cx={scale.toX(time)}
              cy={scale.toY(speedAt(push, time))}
              r="6.5"
              className="fill-accent stroke-card"
              strokeWidth="2.5"
            />
          ) : null
        }
      >
        {({ scale, frame }) => (
          <>
            {/* The push lasts until here. */}
            <rect
              x={scale.toX(0)}
              y={frame.pad.top}
              width={scale.toX(duration) - scale.toX(0)}
              height={frame.height - frame.pad.bottom - frame.pad.top}
              className="fill-accent/15"
            />
            {ran ? (
              <Curve
                segments={curveSegments((x) => speedAt(push, x), frame, {
                  to: Math.max(time, 0.001),
                })}
                width={3.5}
              />
            ) : null}
          </>
        )}
      </Plot>

      <div className="space-y-4 border-t p-4 sm:p-5">
        {goal ? (
          <GoalBanner reached={reached}>
            {reached
              ? t("goalReached", { speed: speed(released) })
              : t("goal", { speed: formatNumber(goal.speed, 1) })}
          </GoalBanner>
        ) : null}

        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
          <Slider
            label={t("force")}
            valueText={`${force} N`}
            value={force}
            min={0}
            max={20}
            step={1}
            onChange={change(setForce)}
            disabled={playback.playing}
          />
          <Slider
            label={t("mass")}
            valueText={`${mass} kg`}
            value={mass}
            min={1}
            max={10}
            step={1}
            onChange={change(setMass)}
            disabled={playback.playing}
          />
          <Slider
            label={t("duration")}
            valueText={`${formatNumber(duration, 1)} s`}
            value={duration}
            min={0.5}
            max={3}
            step={0.5}
            onChange={change(setDuration)}
            disabled={playback.playing}
          />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Segmented
            label={t("surface")}
            value={surface}
            options={(Object.keys(surfaces) as Surface[]).map((key) => ({
              value: key,
              label: t(`surfaces.${key}`),
            }))}
            onChange={change(setSurface)}
            disabled={playback.playing}
          />
          <div className="flex gap-2">
            <Button onClick={() => playback.play()} disabled={playback.playing}>
              <Hand aria-hidden="true" />
              {t("push")}
            </Button>
            <Button variant="outline" onClick={playback.reset} disabled={!ran}>
              <RotateCcw aria-hidden="true" />
              {t("reset")}
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          <Readout
            label={t("acceleration")}
            testId="push-acceleration"
            highlight
            value={formatNumber(acceleration, 2)}
            unit="m/s²"
          />
          <Readout
            label={t("released")}
            testId="push-released"
            value={ran ? speed(released) : "–"}
            unit="m/s"
          />
          <Readout
            label={t("now")}
            testId="push-speed"
            value={ran ? speed(speedAt(push, time)) : "–"}
            unit="m/s"
          />
        </dl>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {finished
            ? t(
                surface === "ice"
                  ? "afterIce"
                  : acceleration === 0
                    ? "stuck"
                    : "afterCarpet",
              )
            : t("shaded")}
        </p>
      </div>
    </div>
  );
}
