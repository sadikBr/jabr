"use client";

import { RotateCcw, ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import type { InteractiveProps } from "@/lib/content/interactive-specs";
import {
  formatNumber,
  functionDefinitions,
  secantSlope,
} from "@/lib/maths/functions";

const WIDTH = 480;
const HEIGHT = 300;
const MAX_ZOOM_EXPONENT = 4; // 10⁴ = 10,000×
const SAMPLES = 96;
const MARGIN = 1.12;

/**
 * Zoom in on a curve at one point. The window spans [x − h, x + h]; the
 * secant runs from the point to the window's right edge, so its slope is the
 * average rate of change over h. As h shrinks the curve straightens and the
 * slope settles on the derivative.
 */
export function TangentZoom({ fn, x0 }: InteractiveProps<"tangent-zoom">) {
  const t = useTranslations("interactives.tangentZoom");
  const id = useId();
  const { f, derivative, domainMin } = functionDefinitions[fn];
  const [exponent, setExponent] = useState(0);
  const [x, setX] = useState(x0);

  const zoom = 10 ** exponent;
  const h = 1 / zoom;
  const y = f(x);
  const slope = secantSlope(f, x, h);

  // Vertical half-range in the same proportion at every zoom level, so the
  // picture changes only because the curve does.
  const yHalf = h * MARGIN * (Math.abs(derivative(x)) + 1.6);
  // The window is a little wider than ±h so the secant's far end stays in view.
  const half = h * MARGIN;
  const toScreenX = (value: number) =>
    ((value - (x - half)) / (2 * half)) * WIDTH;
  const toScreenY = (value: number) =>
    HEIGHT / 2 - ((value - y) / yHalf) * (HEIGHT / 2);

  const curve = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const value = x - half + (2 * half * i) / SAMPLES;
    if (domainMin !== undefined && value < domainMin) return null;
    return `${toScreenX(value).toFixed(2)},${toScreenY(f(value)).toFixed(2)}`;
  })
    .filter(Boolean)
    .join(" ");

  const edgeX = toScreenX(x + h);
  const secantAt = (value: number) => y + slope * (value - x);
  const nearlyStraight = exponent >= 2;
  const zoomLabel = formatNumber(zoom, 0);

  return (
    <div data-subject="maths">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t("description", { fn, x0: formatNumber(x, 2) })}
        className="block w-full bg-background"
      >
        <g className="stroke-border" strokeWidth="1">
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line
              key={`v${fraction}`}
              x1={WIDTH * fraction}
              x2={WIDTH * fraction}
              y1="0"
              y2={HEIGHT}
            />
          ))}
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line
              key={`h${fraction}`}
              y1={HEIGHT * fraction}
              y2={HEIGHT * fraction}
              x1="0"
              x2={WIDTH}
            />
          ))}
        </g>

        {/* The interval h, marked along the bottom. */}
        <g className="stroke-accent text-accent" strokeWidth="2">
          <line
            x1={WIDTH / 2}
            x2={edgeX}
            y1={HEIGHT - 14}
            y2={HEIGHT - 14}
            strokeDasharray="4 4"
          />
          <line
            x1={WIDTH / 2}
            x2={WIDTH / 2}
            y1={HEIGHT - 20}
            y2={HEIGHT - 8}
          />
          <line x1={edgeX} x2={edgeX} y1={HEIGHT - 20} y2={HEIGHT - 8} />
        </g>
        <text
          x={(WIDTH / 2 + edgeX) / 2}
          y={HEIGHT - 22}
          textAnchor="middle"
          className="fill-foreground text-[13px] font-semibold"
        >
          h = {formatNumber(h, 4)}
        </text>

        <line
          x1="0"
          y1={toScreenY(secantAt(x - half))}
          x2={WIDTH}
          y2={toScreenY(secantAt(x + half))}
          className="stroke-accent"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <polyline
          points={curve}
          fill="none"
          className="stroke-tone"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={edgeX}
          cy={toScreenY(f(x + h))}
          r="6"
          className="fill-accent stroke-card"
          strokeWidth="2.5"
        />
        <circle
          cx={WIDTH / 2}
          cy={HEIGHT / 2}
          r="7.5"
          className="fill-tone stroke-card"
          strokeWidth="3"
        />
      </svg>

      <div className="grid gap-4 border-t p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-background p-3">
            <dt className="text-xs font-medium text-muted-foreground">
              {t("windowLabel")}
            </dt>
            <dd className="mt-0.5 font-mono text-xl font-semibold tabular-nums">
              {formatNumber(h, 4)}
            </dd>
          </div>
          <div className="rounded-xl border border-accent/50 bg-accent/15 p-3">
            <dt className="text-xs font-medium text-muted-foreground">
              {t("slopeLabel")}
            </dt>
            <dd
              className="mt-0.5 font-mono text-xl font-semibold tabular-nums"
              data-testid="secant-slope"
            >
              {formatNumber(slope, 4)}
            </dd>
          </div>
        </dl>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              setExponent((value) => Math.min(value + 1, MAX_ZOOM_EXPONENT))
            }
            disabled={exponent >= MAX_ZOOM_EXPONENT}
            className="flex-1 sm:flex-none"
          >
            <ZoomIn aria-hidden="true" />
            {t("zoomIn")}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setExponent(0);
              setX(x0);
            }}
          >
            <RotateCcw aria-hidden="true" />
            {t("reset")}
          </Button>
        </div>

        <div className="grid gap-x-6 gap-y-1 sm:col-span-2 sm:grid-cols-2">
          <label htmlFor={`${id}-zoom`} className="block text-sm font-medium">
            <span className="flex justify-between">
              {t("zoom")}
              <span className="font-mono text-muted-foreground tabular-nums">
                {t("zoomValue", { value: zoomLabel })}
              </span>
            </span>
            <input
              id={`${id}-zoom`}
              type="range"
              className="slider"
              min={0}
              max={MAX_ZOOM_EXPONENT}
              step={0.05}
              value={exponent}
              aria-valuetext={t("zoomValue", { value: zoomLabel })}
              onChange={(event) => setExponent(Number(event.target.value))}
            />
          </label>
          <label htmlFor={`${id}-x`} className="block text-sm font-medium">
            <span className="flex justify-between">
              {t("point")}
              <span className="font-mono text-muted-foreground tabular-nums">
                {formatNumber(x, 2)}
              </span>
            </span>
            <input
              id={`${id}-x`}
              type="range"
              className="slider"
              min={domainMin !== undefined ? domainMin + 0.25 : -3}
              max={3}
              step={0.25}
              value={x}
              onChange={(event) => setX(Number(event.target.value))}
            />
          </label>
        </div>

        <p className="sr-only" aria-live="polite">
          {t("live", {
            zoom: zoomLabel,
            h: formatNumber(h, 4),
            slope: formatNumber(slope, 4),
          })}
        </p>
        {nearlyStraight ? (
          <p className="animate-rise-in text-sm font-medium text-tone sm:col-span-2">
            {t("straight")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
