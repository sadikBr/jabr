/**
 * Euler's method for dy/dt = f(t, y): from each point, move one step along
 * the slope there. Each problem below has an exact solution to compare with.
 */

export interface OdeProblem {
  /** The equation as TeX, for display. */
  equation: string;
  /** The exact solution as TeX. */
  solution: string;
  slope: (t: number, y: number) => number;
  exact: (t: number) => number;
  y0: number;
  /** The interval is t from 0 to tEnd. */
  tEnd: number;
  /** Vertical range worth showing. */
  yRange: [number, number];
}

const G = 9.81;
const TERMINAL_VELOCITY = 12; // m/s, for the falling-with-drag problem

export const odeProblems = {
  growth: {
    equation: "\\dfrac{dy}{dt} = y",
    solution: "y = e^{t}",
    slope: (_t, y) => y,
    exact: (t) => Math.exp(t),
    y0: 1,
    tEnd: 2,
    yRange: [0, 8],
  },
  cooling: {
    equation: "\\dfrac{dT}{dt} = -0.5\\,(T - 20)",
    solution: "T = 20 + 70\\,e^{-0.5t}",
    slope: (_t, y) => -0.5 * (y - 20),
    exact: (t) => 20 + 70 * Math.exp(-0.5 * t),
    y0: 90,
    tEnd: 8,
    yRange: [0, 100],
  },
  "falling-with-drag": {
    equation: "\\dfrac{dv}{dt} = g - \\dfrac{g}{v_t^2}\\,v^2",
    solution: "v = v_t \\tanh\\!\\left(\\dfrac{g\\,t}{v_t}\\right)",
    slope: (_t, v) => G - (G / TERMINAL_VELOCITY ** 2) * v * v,
    exact: (t) => TERMINAL_VELOCITY * Math.tanh((G * t) / TERMINAL_VELOCITY),
    y0: 0,
    // Short enough that the object is still speeding up at the end, so the
    // error there shows the step size clearly.
    tEnd: 1.5,
    yRange: [0, 14],
  },
} as const satisfies Record<string, OdeProblem>;

export type OdeProblemId = keyof typeof odeProblems;
export const odeProblemIds = Object.keys(odeProblems) as [
  OdeProblemId,
  ...OdeProblemId[],
];

export interface EulerPoint {
  t: number;
  y: number;
}

/** The points Euler's method visits when the interval is cut into `steps` steps. */
export function eulerSteps(problem: OdeProblem, steps: number): EulerPoint[] {
  const dt = problem.tEnd / steps;
  const points: EulerPoint[] = [{ t: 0, y: problem.y0 }];
  let y = problem.y0;
  for (let i = 0; i < steps; i++) {
    y += problem.slope(i * dt, y) * dt;
    points.push({ t: (i + 1) * dt, y });
  }
  return points;
}

/** How far off Euler's method is at the end of the interval. */
export function finalError(problem: OdeProblem, steps: number): number {
  const points = eulerSteps(problem, steps);
  return Math.abs(points[points.length - 1]!.y - problem.exact(problem.tEnd));
}
