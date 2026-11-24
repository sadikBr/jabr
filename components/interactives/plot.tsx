"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { formatNumber } from "@/lib/maths/functions";
import {
  createScale,
  niceTicks,
  type PlotFrame,
  type PlotScale,
} from "@/lib/maths/plot";
import { cn } from "@/lib/utils";

/** The size assumed until the graph has been measured in the browser. */
const DEFAULT_SIZE = { width: 520, height: 260 };
const DEFAULT_PAD = { left: 40, right: 16, top: 22, bottom: 26 };
/** Taller on a phone, where width is scarce; wider on a big screen. */
const DEFAULT_SHAPE = "aspect-[4/3] sm:aspect-[2/1]";

export interface PlotView {
  frame: PlotFrame;
  scale: PlotScale;
}

/**
 * The frame every graph shares: grid, axes and tick labels, with the curves
 * drawn clipped to the plotting area.
 *
 * The graph is drawn at its real size on screen (one unit is one pixel), so
 * text and lines are as readable on a phone as on a desktop. Its shape comes
 * from CSS (`shape`, a set of aspect-ratio classes), so the page does not
 * jump when the size is first measured.
 *
 * With `onDrag` the graph can be dragged, by mouse, pen or finger; sideways
 * drags are ours and vertical ones still scroll the page. Every draggable
 * graph also needs sliders, so it works from the keyboard.
 */
export function Plot({
  x,
  y,
  shape = DEFAULT_SHAPE,
  pad,
  label,
  xTicks,
  yTicks,
  xLabel,
  yLabel,
  onDrag,
  overlay,
  children,
  className,
  testId,
}: {
  x: readonly [number, number];
  y: readonly [number, number];
  /** Aspect-ratio classes that give the graph its shape at each screen size. */
  shape?: string;
  pad?: Partial<PlotFrame["pad"]>;
  /** Describes the graph to screen readers. */
  label: string;
  xTicks?: readonly number[];
  yTicks?: readonly number[];
  xLabel?: string;
  yLabel?: string;
  /** Called with graph coordinates while the pointer is down. */
  onDrag?: (x: number, y: number, phase: "start" | "move") => void;
  /** Drawn on top, not clipped: handles and labels. */
  overlay?: (view: PlotView) => ReactNode;
  /** Drawn clipped to the plotting area: curves and guide lines. */
  children?: (view: PlotView) => ReactNode;
  className?: string;
  testId?: string;
}) {
  const clipId = useId();
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const [{ width, height }, setSize] = useState(DEFAULT_SIZE);

  useEffect(() => {
    const element = svg.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      if (width > 0 && height > 0) {
        setSize({ width: Math.round(width), height: Math.round(height) });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const padding = { ...DEFAULT_PAD, ...pad };
  // Room for the name of the horizontal axis, under its numbers.
  if (xLabel) padding.bottom += 16;
  const frame: PlotFrame = { width, height, pad: padding, x, y };
  const scale = createScale(frame);
  const view = { frame, scale };
  const right = width - frame.pad.right;
  const bottom = height - frame.pad.bottom;
  const xMarks = xTicks ?? niceTicks(x[0], x[1], 6);
  const yMarks = yTicks ?? niceTicks(y[0], y[1], height < 190 ? 3 : 5);

  const locate = (event: ReactPointerEvent) => {
    const box = svg.current!.getBoundingClientRect();
    return [
      scale.fromX(((event.clientX - box.left) / box.width) * width),
      scale.fromY(((event.clientY - box.top) / box.height) * height),
    ] as const;
  };

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      data-testid={testId}
      className={cn(
        "block w-full bg-background select-none",
        shape,
        onDrag && "cursor-ew-resize touch-pan-y",
        className,
      )}
      onPointerDown={
        onDrag
          ? (event) => {
              dragging.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              onDrag(...locate(event), "start");
            }
          : undefined
      }
      onPointerMove={
        onDrag
          ? (event) => {
              if (dragging.current) onDrag(...locate(event), "move");
            }
          : undefined
      }
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            x={frame.pad.left}
            y={frame.pad.top}
            width={right - frame.pad.left}
            height={bottom - frame.pad.top}
          />
        </clipPath>
      </defs>

      {yMarks.map((value) => (
        <g key={`y${value}`}>
          <line
            x1={frame.pad.left}
            x2={right}
            y1={scale.toY(value)}
            y2={scale.toY(value)}
            className="stroke-border"
          />
          <text
            x={frame.pad.left - 7}
            y={scale.toY(value) + 4}
            textAnchor="end"
            className="fill-muted-foreground text-[11px]"
          >
            {formatNumber(value, 2)}
          </text>
        </g>
      ))}
      {xMarks.map((value) => (
        <g key={`x${value}`}>
          <line
            x1={scale.toX(value)}
            x2={scale.toX(value)}
            y1={frame.pad.top}
            y2={bottom}
            className="stroke-border"
          />
          <text
            x={scale.toX(value)}
            y={bottom + 15}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            {formatNumber(value, 2)}
          </text>
        </g>
      ))}

      {/* The axes themselves, where they are in view. */}
      <g className="stroke-muted-foreground" strokeWidth="1.25">
        {y[0] <= 0 && y[1] >= 0 ? (
          <line
            x1={frame.pad.left}
            x2={right}
            y1={scale.toY(0)}
            y2={scale.toY(0)}
          />
        ) : null}
        {x[0] <= 0 && x[1] >= 0 ? (
          <line
            x1={scale.toX(0)}
            x2={scale.toX(0)}
            y1={frame.pad.top}
            y2={bottom}
          />
        ) : null}
      </g>

      {xLabel ? (
        <text
          x={(frame.pad.left + right) / 2}
          y={height - 6}
          textAnchor="middle"
          className="fill-muted-foreground text-[11px] font-semibold"
        >
          {xLabel}
        </text>
      ) : null}
      {yLabel ? (
        <text
          x={frame.pad.left + 6}
          y={frame.pad.top - 8}
          className="fill-muted-foreground text-[11px] font-semibold"
        >
          {yLabel}
        </text>
      ) : null}

      <g clipPath={`url(#${clipId})`}>{children?.(view)}</g>
      {overlay?.(view)}
    </svg>
  );
}

/** One or more polylines from `curveSegments`. */
export function Curve({
  segments,
  className = "stroke-tone",
  width = 3,
}: {
  segments: readonly string[];
  className?: string;
  width?: number;
}) {
  return segments.map((points, index) => (
    <polyline
      key={index}
      points={points}
      fill="none"
      className={className}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ));
}

/** A point on a graph: something the learner moves, or a value being read. */
export function Dot({
  x,
  y,
  size = 6.5,
  className = "fill-accent stroke-card",
  testId,
}: {
  x: number;
  y: number;
  size?: number;
  className?: string;
  testId?: string;
}) {
  return (
    <circle
      cx={x}
      cy={y}
      r={size}
      className={className}
      strokeWidth="2.5"
      data-testid={testId}
    />
  );
}

/** A legend entry: a short line in the series' colour, then its name. */
export function LegendItem({
  className,
  children,
}: {
  /** The swatch's background, e.g. `bg-tone`. */
  className: string;
  children: ReactNode;
}) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn("h-1 w-6 rounded-full", className)}
      />
      {children}
    </span>
  );
}
