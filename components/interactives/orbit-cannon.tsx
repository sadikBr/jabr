"use client";

import { Rocket, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { InteractiveProps } from "@/lib/content/interactive-specs";
import { formatNumber } from "@/lib/maths/functions";
import { EARTH_RADIUS, fly } from "@/lib/sim/orbit";
import { cn } from "@/lib/utils";

import { GoalBanner, Readout, Slider, useGoal, usePlayback } from "./parts";
import { Plot } from "./plot";

/** How long the animation of a flight takes, in seconds. */
const SHOW_FOR = 6;
/** The view never zooms out further than this many Earth radii from the centre. */
const WIDEST = 8;

/**
 * Newton's cannonball. Fire it sideways from high above the Earth: too slow
 * and it falls to the ground, fast enough and the ground curves away beneath
 * it as fast as it falls. That is an orbit.
 */
export function OrbitCannon({
  speed: initialSpeed,
  altitude,
  goal,
}: InteractiveProps<"orbit-cannon">) {
  const t = useTranslations("interactives.orbit");
  const [goalRef, reachGoal] = useGoal("orbit-cannon");
  const [speed, setSpeed] = useState(initialSpeed);
  const flight = useMemo(() => fly(speed, altitude), [speed, altitude]);
  const { points, outcome } = flight;
  const duration = points[points.length - 1]!.t;
  const playback = usePlayback(duration, duration / SHOW_FOR);
  const ran = playback.time !== null;
  const finished = ran && !playback.playing;
  const time = playback.time ?? 0;

  const reached = goal && finished && outcome.kind === "orbit";
  useEffect(() => {
    if (reached) reachGoal();
  }, [reached, reachGoal]);

  // The part of the path flown so far.
  const flown = points.filter((point) => point.t <= time);
  const here = flown[flown.length - 1] ?? points[0]!;
  // What has to be in view: the Earth and the whole path, unless the path
  // leaves, in which case only as far as the view is allowed to widen.
  const limit = WIDEST * EARTH_RADIUS;
  const edge = (values: number[], side: 1 | -1) =>
    side *
    Math.min(
      Math.max(EARTH_RADIUS * 1.25, ...values.map((value) => side * value)) *
        1.08,
      limit,
    );
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  const km = (value: number) => formatNumber(value, 0);
  const minutes = (seconds: number) => formatNumber(seconds / 60, 0);
  let status: string;
  if (!finished) {
    status = t("prompt", { altitude });
  } else if (outcome.kind === "crash") {
    status =
      outcome.groundDistance < 1
        ? t("dropped", { minutes: minutes(outcome.time) })
        : t("crash", {
            distance: km(outcome.groundDistance),
            minutes: minutes(outcome.time),
          });
  } else if (outcome.kind === "escape") {
    status = t("escape");
  } else if (outcome.highest - outcome.lowest < 150) {
    status = t("circle", {
      altitude: km((outcome.highest + outcome.lowest) / 2),
      minutes: minutes(outcome.period),
    });
  } else {
    status = t("ellipse", {
      lowest: km(outcome.lowest),
      highest: km(outcome.highest),
      hours: formatNumber(outcome.period / 3600, 1),
    });
  }

  return (
    <div ref={goalRef} data-subject="physics">
      <Plot
        x={[edge(xs, -1), edge(xs, 1)]}
        y={[edge(ys, -1), edge(ys, 1)]}
        square
        axes={false}
        shape="aspect-square sm:aspect-[3/2]"
        pad={{ left: 8, right: 8, top: 8, bottom: 8 }}
        xTicks={[]}
        yTicks={[]}
        label={t("description", { altitude, speed: formatNumber(speed, 1) })}
        overlay={({ scale }) => {
          const centre = { x: scale.toX(0), y: scale.toY(0) };
          const radius = scale.toX(EARTH_RADIUS) - centre.x;
          return (
            <>
              <circle
                cx={centre.x}
                cy={centre.y}
                r={radius}
                className="fill-[oklch(0.62_0.11_235)]"
              />
              {/* A hint of land, so the Earth does not look like a ball bearing. */}
              <path
                d={`M${centre.x - radius * 0.55} ${centre.y - radius * 0.35} q${radius * 0.3} ${-radius * 0.35} ${radius * 0.6} ${-radius * 0.1} q${radius * 0.1} ${radius * 0.35} ${-radius * 0.2} ${radius * 0.5} q${-radius * 0.3} ${radius * 0.1} ${-radius * 0.4} ${-radius * 0.4} z`}
                className="fill-success/70"
              />
              {/* The whole path, faintly, once the flight is over. */}
              {finished ? (
                <polyline
                  points={points
                    .map((p) => `${scale.toX(p.x)},${scale.toY(p.y)}`)
                    .join(" ")}
                  fill="none"
                  className="stroke-accent/40"
                  strokeWidth="2"
                />
              ) : null}
              {ran ? (
                <polyline
                  points={flown
                    .map((p) => `${scale.toX(p.x)},${scale.toY(p.y)}`)
                    .join(" ")}
                  fill="none"
                  className="stroke-accent"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              <circle
                cx={scale.toX(here.x)}
                cy={scale.toY(here.y)}
                r="6"
                className="fill-foreground stroke-card"
                strokeWidth="2"
                data-testid="orbit-ball"
              />
            </>
          );
        }}
      />

      <div className="space-y-4 border-t p-4 sm:p-5">
        {goal ? (
          <GoalBanner reached={Boolean(reached)}>
            {reached ? t("goalReached") : t("goal")}
          </GoalBanner>
        ) : null}
        <p
          data-testid="orbit-status"
          aria-live="polite"
          className={cn(
            "rounded-xl px-4 py-3 text-sm font-semibold",
            !finished && "bg-muted text-muted-foreground",
            finished &&
              outcome.kind === "orbit" &&
              "bg-success-soft text-success",
            finished && outcome.kind !== "orbit" && "bg-tone-soft text-tone",
          )}
        >
          {status}
        </p>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Slider
            label={t("speed")}
            valueText={t("speedValue", {
              kms: formatNumber(speed, 1),
              kmh: km(speed * 3600),
            })}
            value={speed}
            min={0}
            max={12}
            step={0.1}
            onChange={(value) => {
              playback.reset();
              setSpeed(value);
            }}
            disabled={playback.playing}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => playback.play()}
              disabled={playback.playing}
              className="flex-1 sm:flex-none"
            >
              <Rocket aria-hidden="true" />
              {t("fire")}
            </Button>
            <Button variant="outline" onClick={playback.reset} disabled={!ran}>
              <RotateCcw aria-hidden="true" />
              {t("reset")}
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          <Readout
            label={t("lowest")}
            testId="orbit-lowest"
            value={
              finished && outcome.kind === "orbit" ? km(outcome.lowest) : "–"
            }
            unit="km"
          />
          <Readout
            label={t("highest")}
            testId="orbit-highest"
            value={
              finished && outcome.kind === "orbit" ? km(outcome.highest) : "–"
            }
            unit="km"
          />
          <Readout
            label={t("lap")}
            testId="orbit-period"
            highlight
            value={
              finished && outcome.kind === "orbit"
                ? minutes(outcome.period)
                : "–"
            }
            unit="min"
          />
        </dl>
      </div>
    </div>
  );
}
