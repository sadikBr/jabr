"use client";

import { ArrowDownToLine, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { InteractiveProps } from "@/lib/content/interactive-specs";
import { formatNumber } from "@/lib/maths/functions";
import { distanceFallen, fallTime } from "@/lib/sim/fall";

import { Readout, Segmented, Toggle, usePlayback } from "./parts";

const WIDTH = 480;
const HEIGHT = 340;
const TOP_Y = 46;
const GROUND_Y = 300;
const DROP_HEIGHT = 1.6; // metres, about the height Scott dropped them from
const STROBE_INTERVAL = 0.1; // seconds between the ghost images

const places = {
  moon: { gravity: 1.62, hasAir: false },
  earth: { gravity: 9.81, hasAir: true },
} as const;
type Place = keyof typeof places;

// Same numbers as the explainer's Python: a hammer, and a 3-gram feather.
const objects = {
  hammer: { mass: 1.32, drag: 0.005, x: 160 },
  feather: { mass: 0.003, drag: 0.01, x: 320 },
} as const;
type ObjectName = keyof typeof objects;

const toY = (fallen: number) =>
  TOP_Y +
  (Math.min(fallen, DROP_HEIGHT) / DROP_HEIGHT) * (GROUND_Y - TOP_Y - 22);

/**
 * Drop a hammer and a feather together, on the Moon or on Earth, with or
 * without air. Ghost images every tenth of a second show them speeding up.
 */
export function DropTest({
  place: initialPlace,
  air: initialAir,
}: InteractiveProps<"drop-test">) {
  const t = useTranslations("interactives.dropTest");
  const [place, setPlace] = useState<Place>(initialPlace);
  const [airWanted, setAirWanted] = useState(initialAir);
  const { gravity, hasAir } = places[place];
  const air = airWanted && hasAir;

  const body = (name: ObjectName) => ({
    mass: objects[name].mass,
    drag: air ? objects[name].drag : 0,
  });
  const times = {
    hammer: fallTime(body("hammer"), gravity, DROP_HEIGHT),
    feather: fallTime(body("feather"), gravity, DROP_HEIGHT),
  };
  const duration = Math.max(times.hammer, times.feather);
  // Earth falls are over in half a second, so they play in slow motion.
  const timeScale = place === "earth" ? 0.5 : 1;
  const { time, playing, play, reset } = usePlayback(duration, timeScale);
  const finished = time !== null && !playing;

  function change(update: () => void) {
    update();
    reset();
  }

  const strobes = (name: ObjectName) => {
    if (time === null) return [];
    const count = Math.floor(Math.min(time, times[name]) / STROBE_INTERVAL);
    return Array.from({ length: count }, (_, i) =>
      toY(distanceFallen(body(name), gravity, (i + 1) * STROBE_INTERVAL)),
    );
  };
  const y = (name: ObjectName) =>
    toY(
      time === null
        ? 0
        : distanceFallen(body(name), gravity, Math.min(time, times[name])),
    );

  const tie = Math.abs(times.hammer - times.feather) < 0.005;

  return (
    <div data-subject="physics">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t("description", {
          place: t(`places.${place}`),
          air: air ? t("withAir") : t("withoutAir"),
        })}
        className={
          place === "moon"
            ? "block w-full bg-[oklch(0.2_0.03_272)]"
            : "block w-full bg-background"
        }
      >
        {place === "moon" ? (
          <g fill="white">
            {[
              [40, 30],
              [120, 70],
              [210, 24],
              [300, 90],
              [400, 40],
              [440, 130],
              [70, 150],
              [260, 160],
              [380, 210],
              [30, 240],
            ].map(([cx, cy], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={i % 3 === 0 ? 1.6 : 1}
                opacity={0.5 + (i % 4) * 0.12}
              />
            ))}
          </g>
        ) : air ? (
          <g
            className="stroke-muted-foreground"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.35"
          >
            {[70, 130, 190, 250].map((lineY, i) => (
              <path
                key={lineY}
                d={`M${30 + i * 20} ${lineY} q30 -10 60 0 t60 0`}
                fill="none"
              />
            ))}
            {[100, 160, 220].map((lineY, i) => (
              <path
                key={lineY}
                d={`M${330 - i * 14} ${lineY} q30 -10 60 0 t60 0`}
                fill="none"
              />
            ))}
          </g>
        ) : null}

        {/* Ground */}
        <rect
          x="0"
          y={GROUND_Y}
          width={WIDTH}
          height={HEIGHT - GROUND_Y}
          className={
            place === "moon"
              ? "fill-[oklch(0.62_0.01_272)]"
              : "fill-[oklch(0.62_0.12_150)]"
          }
        />
        {place === "moon" ? (
          <g className="fill-[oklch(0.52_0.01_272)]">
            <ellipse cx="90" cy={GROUND_Y + 16} rx="34" ry="7" />
            <ellipse cx="410" cy={GROUND_Y + 22} rx="24" ry="5" />
            <ellipse cx="250" cy={GROUND_Y + 28} rx="16" ry="4" />
          </g>
        ) : null}

        {(["hammer", "feather"] as const).map((name) => (
          <g key={name}>
            {strobes(name).map((strobeY, i) => (
              <circle
                key={i}
                cx={objects[name].x}
                cy={strobeY + 10}
                r="3"
                className={
                  place === "moon" ? "fill-white" : "fill-muted-foreground"
                }
                opacity="0.45"
              />
            ))}
            <g transform={`translate(${objects[name].x} ${y(name)})`}>
              {name === "hammer" ? (
                <Hammer />
              ) : (
                <Feather light={place === "moon"} />
              )}
            </g>
            <text
              x={objects[name].x}
              y="24"
              textAnchor="middle"
              className={
                place === "moon"
                  ? "fill-white text-[13px] font-semibold"
                  : "fill-foreground text-[13px] font-semibold"
              }
            >
              {t(`objects.${name}`)}
            </text>
          </g>
        ))}
      </svg>

      <div className="space-y-4 border-t p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <Segmented
            label={t("where")}
            value={place}
            disabled={playing}
            onChange={(value) => change(() => setPlace(value))}
            options={[
              { value: "moon", label: t("places.moon") },
              { value: "earth", label: t("places.earth") },
            ]}
          />
          <Toggle
            label={t("air")}
            hint={hasAir ? undefined : t("noAirOnMoon")}
            checked={air}
            disabled={!hasAir || playing}
            onChange={(value) => change(() => setAirWanted(value))}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="lg"
            onClick={() => play()}
            disabled={playing}
            className="bg-tone text-background hover:bg-tone/90 max-sm:flex-1"
          >
            <ArrowDownToLine aria-hidden="true" />
            {finished ? t("dropAgain") : t("drop")}
          </Button>
          {time !== null ? (
            <Button
              size="lg"
              variant="outline"
              onClick={reset}
              disabled={playing}
            >
              <RotateCcw aria-hidden="true" />
              {t("reset")}
            </Button>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-2 sm:gap-3">
          {(["hammer", "feather"] as const).map((name) => (
            <Readout
              key={name}
              label={t("landsAfter", { object: t(`objects.${name}`) })}
              testId={`drop-${name}`}
              highlight={finished}
              value={finished ? `${formatNumber(times[name], 2)} s` : "–"}
            />
          ))}
        </dl>
        <p
          className="min-h-10 text-sm text-muted-foreground"
          aria-live="polite"
        >
          {finished
            ? tie
              ? t("resultTie")
              : t("resultApart", {
                  gap: formatNumber(times.feather - times.hammer, 2),
                })
            : place === "earth"
              ? t("slowMotion")
              : t("prompt")}
        </p>
      </div>
    </div>
  );
}

function Hammer() {
  return (
    <g>
      <rect x="-4" y="-2" width="8" height="26" rx="2" fill="#a16207" />
      <rect x="-15" y="-10" width="30" height="12" rx="3" fill="#64748b" />
      <rect x="-15" y="-10" width="8" height="12" rx="2" fill="#475569" />
    </g>
  );
}

function Feather({ light }: { light: boolean }) {
  return (
    <g transform="rotate(20)">
      <path
        d="M0 24 C-14 12 -12 -8 0 -16 C12 -8 14 12 0 24 Z"
        fill={light ? "#e2e8f0" : "#94a3b8"}
        stroke={light ? "#f8fafc" : "#64748b"}
        strokeWidth="1"
      />
      <line
        x1="0"
        y1="-14"
        x2="0"
        y2="30"
        stroke={light ? "#f8fafc" : "#475569"}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>
  );
}
