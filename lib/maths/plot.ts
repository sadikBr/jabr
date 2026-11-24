/**
 * Geometry for the SVG plots the interactives draw: mapping between graph
 * and screen coordinates, tick positions, and turning a function into line
 * segments. Pure, so the same numbers can be tested without a browser.
 */

export interface PlotFrame {
  width: number;
  height: number;
  pad: { left: number; right: number; top: number; bottom: number };
  x: readonly [number, number];
  y: readonly [number, number];
}

export interface PlotScale {
  toX: (x: number) => number;
  toY: (y: number) => number;
  /** Screen x (in viewBox units) back to a graph x, kept inside the frame. */
  fromX: (screenX: number) => number;
  fromY: (screenY: number) => number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Rounds to the nearest multiple of `step`, without floating-point crumbs. */
export function snap(value: number, step: number): number {
  return Number((Math.round(value / step) * step).toFixed(10));
}

export function createScale(frame: PlotFrame): PlotScale {
  const { width, height, pad } = frame;
  const [xMin, xMax] = frame.x;
  const [yMin, yMax] = frame.y;
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  return {
    toX: (x) => pad.left + ((x - xMin) / (xMax - xMin)) * innerWidth,
    toY: (y) =>
      height - pad.bottom - ((y - yMin) / (yMax - yMin)) * innerHeight,
    fromX: (screenX) =>
      clamp(
        xMin + ((screenX - pad.left) / innerWidth) * (xMax - xMin),
        xMin,
        xMax,
      ),
    fromY: (screenY) =>
      clamp(
        yMin + ((height - pad.bottom - screenY) / innerHeight) * (yMax - yMin),
        yMin,
        yMax,
      ),
  };
}

/**
 * Round tick values covering [min, max]: steps of 1, 2 or 5 times a power of
 * ten, aiming for about `target` ticks.
 */
export function niceTicks(min: number, max: number, target = 5): number[] {
  const span = max - min;
  if (!(span > 0)) return [min];
  const rough = span / target;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 5, 10].find((factor) => factor * magnitude >= rough)! * magnitude;
  const ticks: number[] = [];
  for (let i = Math.ceil(min / step - 1e-9); i * step <= max + 1e-9; i++) {
    ticks.push(snap(i * step, step / 1000));
  }
  return ticks;
}

/**
 * Samples `f` across [from, to] and returns SVG polyline point lists. The
 * line is broken wherever the function is undefined or leaves the frame by
 * more than its own height, so asymptotes and jumps are not joined up.
 */
export function curveSegments(
  f: (x: number) => number,
  frame: PlotFrame,
  options: {
    from?: number;
    to?: number;
    samples?: number;
    /** x values where the line must be broken (a jump). */
    breaks?: readonly number[];
  } = {},
): string[] {
  const scale = createScale(frame);
  const from = options.from ?? frame.x[0];
  const to = options.to ?? frame.x[1];
  const samples = options.samples ?? 160;
  const breaks = options.breaks ?? [];
  const [yMin, yMax] = frame.y;
  const margin = yMax - yMin;

  const segments: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length > 1) segments.push(current.join(" "));
    current = [];
  };

  let previous = from;
  for (let i = 0; i <= samples; i++) {
    const x = from + ((to - from) * i) / samples;
    if (breaks.some((at) => previous < at && x >= at)) flush();
    previous = x;
    const y = f(x);
    if (!Number.isFinite(y) || y > yMax + margin || y < yMin - margin) {
      flush();
      continue;
    }
    current.push(`${scale.toX(x).toFixed(1)},${scale.toY(y).toFixed(1)}`);
  }
  flush();
  return segments;
}
