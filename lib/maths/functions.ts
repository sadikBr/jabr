import type { plottableFunctions } from "@/lib/content/interactive-specs";

export type PlottableFunction = (typeof plottableFunctions)[number];

interface FunctionDefinition {
  /** The function and its derivative as people write them. */
  label: string;
  derivativeLabel: string;
  f: (x: number) => number;
  /** Exact derivative, used to draw tangents and check numeric estimates. */
  derivative: (x: number) => number;
  /** Smallest x where the function is defined (inclusive), if any. */
  domainMin?: number;
  /** A window that shows the function and its derivative well. */
  view: {
    x: readonly [number, number];
    y: readonly [number, number];
    slope: readonly [number, number];
  };
}

export const functionDefinitions: Record<
  PlottableFunction,
  FunctionDefinition
> = {
  "2x + 3": {
    label: "2x + 3",
    derivativeLabel: "2",
    f: (x) => 2 * x + 3,
    derivative: () => 2,
    view: { x: [-3, 3], y: [-4, 10], slope: [-1, 4] },
  },
  "x^2": {
    label: "x²",
    derivativeLabel: "2x",
    f: (x) => x * x,
    derivative: (x) => 2 * x,
    view: { x: [-3, 3], y: [-1, 9], slope: [-6, 6] },
  },
  "x^3": {
    label: "x³",
    derivativeLabel: "3x²",
    f: (x) => x ** 3,
    derivative: (x) => 3 * x * x,
    view: { x: [-2, 2], y: [-8, 8], slope: [-2, 12] },
  },
  "x^3 - x": {
    label: "x³ − x",
    derivativeLabel: "3x² − 1",
    f: (x) => x ** 3 - x,
    derivative: (x) => 3 * x * x - 1,
    view: { x: [-2, 2], y: [-6, 6], slope: [-2, 12] },
  },
  "sin(x)": {
    label: "sin(x)",
    derivativeLabel: "cos(x)",
    f: Math.sin,
    derivative: Math.cos,
    view: { x: [-6, 6], y: [-1.5, 1.5], slope: [-1.5, 1.5] },
  },
  "sqrt(x)": {
    label: "√x",
    derivativeLabel: "1 / (2√x)",
    f: Math.sqrt,
    derivative: (x) => 1 / (2 * Math.sqrt(x)),
    domainMin: 0,
    view: { x: [0, 9], y: [0, 3.5], slope: [0, 2] },
  },
};

/** Slope of the secant line from x to x + h. */
export function secantSlope(
  f: (x: number) => number,
  x: number,
  h: number,
): number {
  return (f(x + h) - f(x)) / h;
}

/** Formats a number for display: at most `digits` decimals, no trailing zeros. */
export function formatNumber(value: number, digits = 4): string {
  const rounded = Number(value.toFixed(digits));
  return (Object.is(rounded, -0) ? 0 : rounded).toString();
}
