"use client";

import { Play, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { InteractiveProps } from "@/lib/content/interactive-specs";
import { formatNumber } from "@/lib/maths/functions";
import { defaultWorld, G, runLoop } from "@/lib/sim/game-loop";
import { cn } from "@/lib/utils";

import {
  GoalBanner,
  Readout,
  Segmented,
  Toggle,
  useGoal,
  usePlayback,
} from "./parts";
import { Dot, Plot } from "./plot";

const RATES = ["10", "15", "20", "30", "60"] as const;
/** Room on the right of the graph for the ball as the player would see it. */
const SCREEN = 56;

/**
 * A game's physics loop, one frame at a time. Each dot is where the game
 * thinks the ball is in one frame. With too few frames a second the ball
 * moves further in a frame than the platform is thick, and falls through it.
 */
export function GameLoop({
  fps: initialFps,
  sweep: initialSweep,
  goal,
}: InteractiveProps<"game-loop">) {
  const t = useTranslations("interactives.gameLoop");
  const [goalRef, reachGoal] = useGoal("game-loop");
  const [fps, setFps] = useState(initialFps);
  const [sweep, setSweep] = useState(initialSweep);

  const run = useMemo(() => runLoop(fps, sweep), [fps, sweep]);
  const { frames } = run;
  const duration = frames[frames.length - 1]!.t;
  const playback = usePlayback(duration);
  const ran = playback.time !== null;
  const finished = ran && !playback.playing;
  const time = playback.time ?? 0;

  const fell = run.fellThroughAt !== null;
  const reached =
    goal !== undefined &&
    finished &&
    (goal === "break" ? fell : !fell && sweep && fps <= 20);
  useEffect(() => {
    if (reached) reachGoal();
  }, [reached, reachGoal]);

  const change =
    <Value,>(set: (value: Value) => void) =>
    (value: Value) => {
      playback.reset();
      set(value);
    };

  // What the game has computed so far, and the frame now on screen: the
  // picture only changes when a new frame arrives.
  const shown = frames.filter((frame) => frame.t <= time + 1e-9);
  const current = shown[shown.length - 1] ?? frames[0]!;
  // The ball is fastest as it reaches the platform for the first time.
  const fastest = Math.sqrt(2 * G * defaultWorld.dropHeight);
  const stride = (fastest / fps) * 100; // cm
  const thickness = defaultWorld.thickness * 100;

  let status: string;
  if (!finished) status = t("prompt");
  else if (fell) {
    status = t("fell", { time: formatNumber(run.fellThroughAt!, 2) });
  } else status = t("bounced", { count: run.bounces });

  return (
    <div ref={goalRef} data-subject="computing">
      <Plot
        x={[0, defaultWorld.duration]}
        y={[-1.6, defaultWorld.dropHeight * 1.12]}
        pad={{ right: 16 + SCREEN }}
        yTicks={[0, 1, 2, 3, 4, 5]}
        xLabel={t("timeAxis")}
        yLabel={t("heightAxis")}
        label={t("description", { fps })}
        overlay={({ scale, frame }) => {
          const screenX = frame.width - 16 - SCREEN / 2;
          const top = scale.toY(0);
          const slab = scale.toY(-defaultWorld.thickness) - top;
          return (
            <>
              {/* What the player sees: the ball, and the platform under it. */}
              <rect
                x={screenX - 20}
                y={top}
                width="40"
                height={Math.max(slab, 3)}
                className="fill-foreground"
              />
              <Dot
                x={screenX}
                y={scale.toY(Math.max(current.y, -1.4)) - 9}
                size={9}
                className="fill-tone stroke-card"
                testId="game-ball"
              />
            </>
          );
        }}
      >
        {({ scale, frame }) => (
          <>
            <rect
              x={frame.pad.left}
              y={scale.toY(0)}
              width={frame.width - frame.pad.left - frame.pad.right}
              height={Math.max(
                scale.toY(-defaultWorld.thickness) - scale.toY(0),
                3,
              )}
              className="fill-foreground/70"
            />
            {ran ? (
              <>
                <polyline
                  points={shown
                    .map((f) => `${scale.toX(f.t)},${scale.toY(f.y)}`)
                    .join(" ")}
                  fill="none"
                  className="stroke-accent/50"
                  strokeWidth="1.5"
                />
                {shown.map((f) => (
                  <circle
                    key={f.t}
                    cx={scale.toX(f.t)}
                    cy={scale.toY(f.y)}
                    r={fps > 30 ? 2 : 3.5}
                    className={f.y < 0 ? "fill-danger" : "fill-accent"}
                  />
                ))}
              </>
            ) : null}
          </>
        )}
      </Plot>

      <div className="space-y-4 border-t p-4 sm:p-5">
        {goal ? (
          <GoalBanner reached={reached}>
            {t(reached ? `${goal}Reached` : `${goal}Goal`)}
          </GoalBanner>
        ) : null}
        <p
          data-testid="game-status"
          aria-live="polite"
          className={cn(
            "rounded-xl px-4 py-3 text-sm font-semibold",
            !finished && "bg-muted text-muted-foreground",
            finished && !fell && "bg-success-soft text-success",
            finished && fell && "bg-danger-soft text-danger",
          )}
        >
          {status}
        </p>

        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <Segmented
            label={t("fps")}
            value={String(fps) as (typeof RATES)[number]}
            options={RATES.map((rate) => ({ value: rate, label: rate }))}
            onChange={(value) => change(setFps)(Number(value) as typeof fps)}
            disabled={playback.playing}
          />
          <div className="flex gap-2">
            <Button onClick={() => playback.play()} disabled={playback.playing}>
              <Play aria-hidden="true" />
              {t("drop")}
            </Button>
            <Button variant="outline" onClick={playback.reset} disabled={!ran}>
              <RotateCcw aria-hidden="true" />
              {t("reset")}
            </Button>
          </div>
        </div>
        <Toggle
          label={t("sweep")}
          hint={t("sweepHint")}
          checked={sweep}
          onChange={change(setSweep)}
          disabled={playback.playing}
        />

        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          <Readout
            label={t("frameTime")}
            value={formatNumber(1000 / fps, 1)}
            unit="ms"
          />
          <Readout
            label={t("stride")}
            testId="game-stride"
            highlight
            value={formatNumber(stride, 0)}
            unit="cm"
          />
          <Readout
            label={t("thickness")}
            value={formatNumber(thickness, 0)}
            unit="cm"
          />
        </dl>
      </div>
    </div>
  );
}
