"use client";

import { Rocket, Shuffle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { InteractiveProps } from "@/lib/content/interactive-specs";
import { formatNumber } from "@/lib/maths/functions";
import { positionAt, simulateProjectile } from "@/lib/sim/projectile";

import {
  GoalBanner,
  Readout,
  Slider,
  Toggle,
  useGoal,
  usePlayback,
} from "./parts";

// Scene: 100 m wide and 50 m tall, drawn to scale so angles look right.
const WIDTH = 600;
const HEIGHT = 330;
const ORIGIN_X = 40;
const GROUND_Y = 300;
const SCALE = 5.4; // pixels per metre
const SCENE_METRES = 100;
const DRAG = 0.012; // k/m in 1/m when air is on
const PLAYBACK_SPEED = 1.8;

const sx = (metres: number) => ORIGIN_X + metres * SCALE;
const sy = (metres: number) => GROUND_Y - metres * SCALE;

/**
 * Launch a ball and see where it lands. In goal mode there is a target to
 * hit: no path preview, just aim, fire and adjust.
 */
export function ProjectileSim({
  speed: initialSpeed,
  angle: initialAngle,
  gravity,
  goal,
}: InteractiveProps<"projectile-sim">) {
  const t = useTranslations("interactives.projectile");
  const [speed, setSpeed] = useState(initialSpeed);
  const [angle, setAngle] = useState(initialAngle);
  const [air, setAir] = useState(false);
  const [target, setTarget] = useState(goal?.target ?? 0);
  const [shots, setShots] = useState(0);
  const [landed, setLanded] = useState<number | null>(null);
  const [trails, setTrails] = useState<string[]>([]);
  const [goalRef, reachGoal] = useGoal("projectile-sim");

  const path = useMemo(
    () => simulateProjectile({ speed, angle, gravity, drag: air ? DRAG : 0 }),
    [speed, angle, gravity, air],
  );
  const { time, playing, play, reset } = usePlayback(
    path.flightTime,
    PLAYBACK_SPEED,
  );

  const tolerance = goal?.tolerance ?? 0;
  const miss = landed === null ? null : landed - target;
  const hit =
    goal !== undefined && miss !== null && Math.abs(miss) <= tolerance;

  const flown = time === null ? [] : path.points.filter((p) => p.t <= time);
  const ball = time === null ? null : positionAt(path, time);
  const trail = [...flown, ...(ball ? [ball] : [])]
    .map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
    .join(" ");

  function change(update: () => void) {
    update();
    reset();
    setLanded(null);
  }

  function launch() {
    setLanded(null);
    setShots((count) => count + 1);
    play(() => {
      setLanded(path.range);
      setTrails((previous) =>
        [
          ...previous,
          path.points
            .map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
            .join(" "),
        ].slice(-3),
      );
      if (goal && Math.abs(path.range - target) <= tolerance) reachGoal();
    });
  }

  function moveTarget() {
    change(() => setTarget(20 + Math.round(Math.random() * 70)));
    setTrails([]);
    setShots(0);
  }

  const barrel = {
    x: ORIGIN_X + 30 * Math.cos((angle * Math.PI) / 180),
    y: GROUND_Y - 30 * Math.sin((angle * Math.PI) / 180),
  };
  const offScene = landed !== null && landed > SCENE_METRES;

  return (
    <div ref={goalRef} data-subject="physics">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t("description", {
          speed,
          angle,
          target: goal ? formatNumber(target, 0) : "none",
        })}
        className="block w-full bg-background"
      >
        {/* Sky grid and distance marks */}
        <g className="stroke-border" strokeWidth="1">
          {[10, 20, 30, 40].map((h) => (
            <line
              key={h}
              x1={ORIGIN_X}
              x2={WIDTH}
              y1={sy(h)}
              y2={sy(h)}
              strokeDasharray="2 6"
            />
          ))}
        </g>
        {[0, 20, 40, 60, 80, 100].map((d) => (
          <g key={d}>
            <line
              x1={sx(d)}
              x2={sx(d)}
              y1={GROUND_Y}
              y2={GROUND_Y + 6}
              className="stroke-muted-foreground"
              strokeWidth="1.5"
            />
            <text
              x={sx(d)}
              y={GROUND_Y + 22}
              textAnchor="middle"
              className="fill-muted-foreground text-[12px]"
            >
              {d} m
            </text>
          </g>
        ))}
        <line
          x1="0"
          x2={WIDTH}
          y1={GROUND_Y}
          y2={GROUND_Y}
          className="stroke-foreground"
          strokeWidth="2"
        />

        {goal ? (
          <g>
            <rect
              x={sx(target - tolerance)}
              y={GROUND_Y - 4}
              width={2 * tolerance * SCALE}
              height="8"
              rx="4"
              className={hit ? "fill-success" : "fill-accent"}
            />
            <line
              x1={sx(target)}
              x2={sx(target)}
              y1={GROUND_Y}
              y2={GROUND_Y - 42}
              className="stroke-foreground"
              strokeWidth="2"
            />
            <path
              d={`M${sx(target)} ${GROUND_Y - 42} l22 8 l-22 8 z`}
              className={hit ? "fill-success" : "fill-accent"}
            />
          </g>
        ) : null}

        {trails.map((points, index) => (
          <polyline
            key={index}
            points={points}
            fill="none"
            className="stroke-muted-foreground"
            strokeWidth="1.5"
            strokeDasharray="3 5"
            opacity={0.35 + 0.2 * index}
          />
        ))}
        {trail ? (
          <polyline
            points={trail}
            fill="none"
            className="stroke-tone"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* Launcher */}
        <line
          x1={ORIGIN_X}
          y1={GROUND_Y}
          x2={barrel.x}
          y2={barrel.y}
          className="stroke-foreground"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <circle
          cx={ORIGIN_X}
          cy={GROUND_Y}
          r="11"
          className="fill-foreground"
        />
        <text
          x={ORIGIN_X + 40}
          y={GROUND_Y - 10}
          className="fill-muted-foreground text-[12px] font-semibold"
        >
          {angle}°
        </text>

        {ball ? (
          <circle
            cx={Math.min(sx(ball.x), WIDTH + 20)}
            cy={sy(ball.y)}
            r="7"
            className="fill-tone stroke-card"
            strokeWidth="2.5"
          />
        ) : null}
      </svg>

      <div className="space-y-4 border-t p-4 sm:p-5">
        {goal ? (
          <GoalBanner reached={hit}>
            <span aria-live="polite" data-testid="projectile-status">
              {hit
                ? t("hit", { distance: formatNumber(landed!, 1), shots })
                : miss === null
                  ? t("goal", { target: formatNumber(target, 0) })
                  : miss < 0
                    ? t("short", { by: formatNumber(-miss, 1) })
                    : t("long", { by: formatNumber(miss, 1) })}
            </span>
          </GoalBanner>
        ) : null}

        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <Slider
            label={t("speed")}
            valueText={`${speed} m/s`}
            value={speed}
            min={5}
            max={30}
            step={1}
            disabled={playing}
            onChange={(value) => change(() => setSpeed(value))}
          />
          <Slider
            label={t("angle")}
            valueText={`${angle}°`}
            value={angle}
            min={5}
            max={85}
            step={1}
            disabled={playing}
            onChange={(value) => change(() => setAngle(value))}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button
            size="lg"
            onClick={launch}
            disabled={playing}
            className="bg-tone text-background hover:bg-tone/90 max-sm:w-full"
          >
            <Rocket aria-hidden="true" />
            {t("launch")}
          </Button>
          <Toggle
            label={t("air")}
            hint={t("airHint")}
            checked={air}
            disabled={playing}
            onChange={(value) => change(() => setAir(value))}
          />
          {goal && hit ? (
            <Button
              variant="outline"
              onClick={moveTarget}
              className="sm:ms-auto"
            >
              <Shuffle aria-hidden="true" />
              {t("moveTarget")}
            </Button>
          ) : null}
        </div>

        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          <Readout
            label={t("range")}
            testId="projectile-range"
            highlight
            value={landed === null ? "–" : `${formatNumber(landed, 1)} m`}
          />
          <Readout
            label={t("height")}
            value={
              landed === null ? "–" : `${formatNumber(path.maxHeight, 1)} m`
            }
          />
          <Readout
            label={t("time")}
            value={
              landed === null ? "–" : `${formatNumber(path.flightTime, 2)} s`
            }
          />
        </dl>
        {offScene ? (
          <p className="text-sm text-muted-foreground">{t("offScene")}</p>
        ) : null}
      </div>
    </div>
  );
}
