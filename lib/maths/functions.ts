import type { plottableFunctions } from "@/lib/content/interactive-specs";

export type PlottableFunction = (typeof plottableFunctions)[number];

interface FunctionDefinition {
  f: (x: number) => number;
  /** Exact derivative, used to draw tangents and check numeric estimates. */
  derivative: (x: number) => number;
  /** Smallest x where the function is defined (inclusive), if any. */
  domainMin?: number;
}

export const functionDefinitions: Record<
  PlottableFunction,
  FunctionDefinition
> = {
  "x^2": { f: (x) => x * x, derivative: (x) => 2 * x },
  "x^3 - x": { f: (x) => x ** 3 - x, derivative: (x) => 3 * x * x - 1 },
  "sin(x)": { f: Math.sin, derivative: Math.cos },
  "sqrt(x)": {
    f: Math.sqrt,
    derivative: (x) => 1 / (2 * Math.sqrt(x)),
    domainMin: 0,
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
