/**
 * Functions for exploring limits and continuity at one point. Each shows a
 * different way a function can behave as x closes in on `a`.
 */

export interface LimitCase {
  /** The function as TeX, for display. */
  tex: string;
  /** The point being approached. */
  a: number;
  /** The function near `a`. Not used at `a` itself: see `value`. */
  f: (x: number) => number;
  /** f(a), or null when the function is not defined there. */
  value: number | null;
  /** What the values approach from each side, or null when they do not settle. */
  left: number | null;
  right: number | null;
  /** The part of the graph worth showing. */
  x: readonly [number, number];
  y: readonly [number, number];
  /** How the function behaves at `a`. */
  kind:
    "continuous" | "hole" | "moved-point" | "jump" | "blow-up" | "oscillating";
}

export const limitCases = {
  smooth: {
    tex: "f(x) = \\tfrac{1}{2}x^2 + 1",
    a: 2,
    f: (x) => 0.5 * x * x + 1,
    value: 3,
    left: 3,
    right: 3,
    x: [0, 4],
    y: [0, 6],
    kind: "continuous",
  },
  hole: {
    tex: "f(x) = \\dfrac{x^2 - 1}{x - 1}",
    a: 1,
    f: (x) => (x * x - 1) / (x - 1),
    value: null,
    left: 2,
    right: 2,
    x: [-1, 3],
    y: [0, 4],
    kind: "hole",
  },
  sinc: {
    tex: "f(x) = \\dfrac{\\sin x}{x}",
    a: 0,
    f: (x) => Math.sin(x) / x,
    value: null,
    left: 1,
    right: 1,
    x: [-8, 8],
    y: [-0.5, 1.5],
    kind: "hole",
  },
  "moved-point": {
    tex: "f(x) = \\begin{cases} x + 1 & x \\neq 1 \\\\ 3 & x = 1 \\end{cases}",
    a: 1,
    f: (x) => x + 1,
    value: 3,
    left: 2,
    right: 2,
    x: [-1, 3],
    y: [0, 4],
    kind: "moved-point",
  },
  jump: {
    tex: "f(x) = \\begin{cases} x & x < 2 \\\\ x + 1 & x \\geq 2 \\end{cases}",
    a: 2,
    f: (x) => (x < 2 ? x : x + 1),
    value: 3,
    left: 2,
    right: 3,
    x: [0, 4],
    y: [0, 6],
    kind: "jump",
  },
  "blow-up": {
    tex: "f(x) = \\dfrac{1}{x^2}",
    a: 0,
    f: (x) => 1 / (x * x),
    value: null,
    left: null,
    right: null,
    x: [-3, 3],
    y: [0, 10],
    kind: "blow-up",
  },
  oscillating: {
    tex: "f(x) = \\sin\\!\\left(\\dfrac{1}{x}\\right)",
    a: 0,
    f: (x) => Math.sin(1 / x),
    value: null,
    left: null,
    right: null,
    x: [-1, 1],
    y: [-1.5, 1.5],
    kind: "oscillating",
  },
} as const satisfies Record<string, LimitCase>;

export type LimitCaseId = keyof typeof limitCases;
export const limitCaseIds = Object.keys(limitCases) as [
  LimitCaseId,
  ...LimitCaseId[],
];

/** The two-sided limit: both sides settle, and on the same number. */
export function twoSidedLimit(c: LimitCase): number | null {
  return c.left !== null && c.left === c.right ? c.left : null;
}

/** Continuous at `a`: defined there, with a limit, and the two agree. */
export function isContinuous(c: LimitCase): boolean {
  const limit = twoSidedLimit(c);
  return c.value !== null && limit !== null && c.value === limit;
}

/**
 * Distances from `a` on a slider that works in powers of ten: position 0 is
 * a distance of 1, position 4 is 0.0001.
 */
export function distanceAt(position: number): number {
  return Number((10 ** -position).toPrecision(3));
}
