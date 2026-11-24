"use client";

import { OctagonAlert, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { InteractiveProps } from "@/lib/content/interactive-specs";
import { formatNumber } from "@/lib/maths/functions";
import {
  brakingDistance,
  distanceAt,
  kmhToMs,
  msToKmh,
  outcome as findOutcome,
  speedAt,
  stoppingTime,
  thinkingDistance,
} from "@/lib/sim/braking";
import { cn } from "@/lib/utils";

import {
  GoalBanner,
  Readout,
  Segmented,
  Slider,
  useGoal,
  usePlayback,
} from "./parts";
import { LegendItem, Plot } from "./plot";

/** How hard the brakes can slow the car on each surface, in m/s². */
export const surfaces = { dry: 7, wet: 4.5, icy: 1.5 } as const;
type Surface = keyof typeof surfaces;
const SPEED_STEP = 5;

/**
 * An emergency stop. The car covers the thinking distance at full speed
 * while the driver reacts, then the braking distance while it slows. The
 * speed–time graph underneath shows both as areas.
 */
export function BrakingDistance({
  speed: initialSpeed,
  reaction: initialReaction,
  surface: initialSurface,
  obstacle,
  goal,
}: InteractiveProps<"braking-distance">) {
  const t = useTranslations("interactives.braking");
  const [goalRef, reachGoal] = useGoal("braking-distance");
  const [kmh, setKmh] = useState(initialSpeed);
  const [reaction, setReaction] = useState(initialReaction);
  const [surface, setSurface] = useState<Surface>(initialSurface);

  const stopFor = (speedKmh: number) => ({
    speed: kmhToMs(speedKmh),
    reaction,
    deceleration: surfaces[surface],
  });
  const stop = stopFor(kmh);
  const result = findOutcome(stop, obstacle);
  // The run ends when the car stops, or when it reaches the obstacle.
  const duration = result.stopped ? stoppingTime(stop) : result.time;
  const playback = usePlayback(duration);
  const time = playback.time ?? 0;
  const ran = playback.time !== null;
  const finished = ran && !playback.playing;
  const travelled = distanceAt(stop, time);

  // The fastest speed, to the nearest step, that still stops in time.
  const atTheLimit =
    result.stopped && !findOutcome(stopFor(kmh + SPEED_STEP), obstacle).stopped;
  const reached = goal && finished && atTheLimit;
  useEffect(() => {
    if (reached) reachGoal();
  }, [reached, reachGoal]);

  const change =
    <Value,>(set: (value: Value) => void) =>
    (value: Value) => {
      playback.reset();
      set(value);
    };

  const thinking = thinkingDistance(stop);
  const braking = brakingDistance(stop);
  const sceneEnd = Math.max(obstacle * 1.25, 40);
  const metres = (value: number) => formatNumber(value, 1);
  const shown = (value: number) => (finished ? metres(value) : "–");

  let status: string;
  if (!finished) {
    status = t("prompt", { obstacle });
  } else if (result.stopped) {
    status = t("stopped", { margin: metres(result.margin) });
  } else {
    status = t("hit", {
      speed: formatNumber(msToKmh(result.impactSpeed), 0),
    });
  }

  return (
    <div ref={goalRef} data-subject="physics">
      <Plot
        x={[-sceneEnd * 0.09, sceneEnd]}
        y={[0, 1]}
        shape="aspect-[5/2] sm:aspect-[4/1]"
        pad={{ left: 8, right: 8, top: 8 }}
        yTicks={[]}
        xLabel={t("distanceAxis")}
        label={t("sceneDescription", { speed: kmh, obstacle })}
        overlay={({ scale, frame }) => {
          const ground = frame.height - frame.pad.bottom;
          const front = scale.toX(travelled);
          const car = Math.min(54, frame.width * 0.12);
          const at = scale.toX(obstacle);
          return (
            <>
              {/* How far it went while thinking, then while braking. */}
              {ran ? (
                <>
                  <rect
                    x={scale.toX(0)}
                    y={ground - 7}
                    width={
                      scale.toX(Math.min(travelled, thinking)) - scale.toX(0)
                    }
                    height="7"
                    className="fill-accent"
                  />
                  {travelled > thinking ? (
                    <rect
                      x={scale.toX(thinking)}
                      y={ground - 7}
                      width={front - scale.toX(thinking)}
                      height="7"
                      className="fill-danger"
                    />
                  ) : null}
                </>
              ) : null}

              {/* A fallen tree across the road. */}
              <g data-testid="braking-obstacle">
                <rect
                  x={at}
                  y={ground - 34}
                  width="12"
                  height="34"
                  rx="3"
                  className="fill-[oklch(0.5_0.08_60)]"
                />
                <circle
                  cx={at + 6}
                  cy={ground - 40}
                  r="15"
                  className="fill-success"
                />
              </g>

              {/* The car: its front bumper marks the distance travelled. */}
              <g
                transform={`translate(${front - car} ${ground - car * 0.5 - 7})`}
                data-testid="braking-car"
              >
                <path
                  d={`M0 ${car * 0.5} V${car * 0.28} Q0 ${car * 0.2} ${car * 0.1} ${car * 0.2} H${car * 0.2} L${car * 0.32} 0 H${car * 0.68} L${car * 0.82} ${car * 0.2} H${car * 0.92} Q${car} ${car * 0.2} ${car} ${car * 0.3} V${car * 0.5} Z`}
                  className="fill-tone"
                />
                <path
                  d={`M${car * 0.27} ${car * 0.19} L${car * 0.36} ${car * 0.06} H${car * 0.64} L${car * 0.74} ${car * 0.19} Z`}
                  className="fill-background/70"
                />
                {[0.24, 0.76].map((wheel) => (
                  <circle
                    key={wheel}
                    cx={car * wheel}
                    cy={car * 0.5}
                    r={car * 0.12}
                    className="fill-foreground"
                  />
                ))}
              </g>
            </>
          );
        }}
      />

      <Plot
        x={[0, Math.max(stoppingTime(stop), 2) * 1.05]}
        y={[0, Math.max(kmh * 1.15, 40)]}
        shape="aspect-[16/9] sm:aspect-[3/1]"
        className="border-t"
        yLabel={t("speedAxis")}
        xLabel={t("timeAxis")}
        label={t("graphDescription")}
      >
        {({ scale }) => {
          if (!ran) return null;
          const x = (seconds: number) => scale.toX(seconds);
          const y = (ms: number) => scale.toY(msToKmh(ms));
          const reacted = Math.min(time, reaction);
          return (
            <>
              {/* The area under the graph is the distance travelled. */}
              <polygon
                points={`${x(0)},${y(0)} ${x(0)},${y(stop.speed)} ${x(reacted)},${y(stop.speed)} ${x(reacted)},${y(0)}`}
                className="fill-accent/35"
              />
              {time > reaction ? (
                <polygon
                  points={`${x(reaction)},${y(0)} ${x(reaction)},${y(stop.speed)} ${x(time)},${y(speedAt(stop, time))} ${x(time)},${y(0)}`}
                  className="fill-danger/30"
                />
              ) : null}
              <polyline
                points={`${x(0)},${y(stop.speed)} ${x(reacted)},${y(stop.speed)} ${x(time)},${y(speedAt(stop, time))}`}
                fill="none"
                className="stroke-tone"
                strokeWidth="3.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          );
        }}
      </Plot>

      <div className="space-y-4 border-t p-4 sm:p-5">
        {goal ? (
          <GoalBanner reached={Boolean(reached)}>
            {reached
              ? t("goalReached", { speed: kmh })
              : t("goal", { obstacle })}
          </GoalBanner>
        ) : null}
        <p
          data-testid="braking-status"
          aria-live="polite"
          className={cn(
            "rounded-xl px-4 py-3 text-sm font-semibold",
            !finished && "bg-muted text-muted-foreground",
            finished && result.stopped && "bg-success-soft text-success",
            finished && !result.stopped && "bg-danger-soft text-danger",
          )}
        >
          {status}
        </p>

        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Slider
            label={t("speed")}
            valueText={`${kmh} km/h`}
            value={kmh}
            min={20}
            max={130}
            step={SPEED_STEP}
            onChange={change(setKmh)}
            disabled={playback.playing}
          />
          <Slider
            label={t("reaction")}
            valueText={`${formatNumber(reaction, 1)} s`}
            value={reaction}
            min={0.5}
            max={2.5}
            step={0.1}
            onChange={change(setReaction)}
            disabled={playback.playing}
          />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Segmented
            label={t("road")}
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
              <OctagonAlert aria-hidden="true" />
              {t("brake")}
            </Button>
            <Button variant="outline" onClick={playback.reset} disabled={!ran}>
              <RotateCcw aria-hidden="true" />
              {t("reset")}
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          <Readout
            label={t("thinking")}
            testId="braking-thinking"
            value={shown(thinking)}
            unit="m"
          />
          <Readout
            label={t("braking")}
            testId="braking-braking"
            value={shown(braking)}
            unit="m"
          />
          <Readout
            label={t("stopping")}
            testId="braking-stopping"
            highlight
            value={shown(thinking + braking)}
            unit="m"
          />
        </dl>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium">
          <LegendItem className="bg-accent">{t("legendThinking")}</LegendItem>
          <LegendItem className="bg-danger">{t("legendBraking")}</LegendItem>
        </p>
      </div>
    </div>
  );
}
