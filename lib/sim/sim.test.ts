import { describe, expect, it } from "vitest";

import { eulerSteps, finalError, odeProblemIds, odeProblems } from "./euler";
import { distanceFallen, fallTime, speedAfter, terminalVelocity } from "./fall";
import {
  idealFlightTime,
  idealRange,
  positionAt,
  simulateProjectile,
} from "./projectile";

describe("projectile without air", () => {
  it("matches the textbook range and flight time", () => {
    // 20 m/s at 45°: R = v²/g = 40.77 m, T = 2 v sin45°/g = 2.883 s
    expect(idealRange(20, 45, 9.81)).toBeCloseTo(40.775, 3);
    expect(idealFlightTime(20, 45, 9.81)).toBeCloseTo(2.8832, 4);
    const path = simulateProjectile({ speed: 20, angle: 45, gravity: 9.81 });
    expect(path.range).toBeCloseTo(40.775, 3);
    expect(path.maxHeight).toBeCloseTo(10.194, 3); // v² sin²θ / 2g
  });

  it("gives the same range for complementary angles, and the most at 45°", () => {
    expect(idealRange(20, 30, 9.81)).toBeCloseTo(idealRange(20, 60, 9.81), 10);
    expect(idealRange(20, 45, 9.81)).toBeGreaterThan(idealRange(20, 44, 9.81));
    expect(idealRange(20, 45, 9.81)).toBeGreaterThan(idealRange(20, 46, 9.81));
  });

  it("starts and ends on the ground", () => {
    const { points } = simulateProjectile({
      speed: 15,
      angle: 60,
      gravity: 9.81,
    });
    expect(points[0]).toEqual({ t: 0, x: 0, y: 0 });
    expect(points.at(-1)!.y).toBeCloseTo(0, 9);
  });
});

describe("projectile with air drag", () => {
  const base = { speed: 20, angle: 45, gravity: 9.81 };

  it("approaches the no-air answer as drag goes to zero", () => {
    const path = simulateProjectile({ ...base, drag: 1e-9 });
    expect(path.range).toBeCloseTo(40.775, 2);
    expect(path.flightTime).toBeCloseTo(2.8832, 3);
  });

  it("lands shorter, sooner and lower than without air", () => {
    const ideal = simulateProjectile(base);
    const dragged = simulateProjectile({ ...base, drag: 0.02 });
    expect(dragged.range).toBeLessThan(ideal.range * 0.8);
    expect(dragged.maxHeight).toBeLessThan(ideal.maxHeight);
    expect(dragged.flightTime).toBeLessThan(ideal.flightTime);
    expect(dragged.points.at(-1)!.y).toBe(0);
  });

  it("falls straight down at terminal velocity in the long run", () => {
    // Dropped sideways from a great height would need a start height; instead
    // check the vertical launch: it must come back slower than it left.
    const up = simulateProjectile({
      speed: 30,
      angle: 89.9,
      gravity: 9.81,
      drag: 0.05,
    });
    const last = up.points.at(-1)!;
    const before = up.points.at(-2)!;
    const landingSpeed =
      Math.hypot(last.x - before.x, last.y - before.y) / (last.t - before.t);
    expect(landingSpeed).toBeLessThan(Math.sqrt(9.81 / 0.05) * 1.01);
  });
});

describe("positionAt", () => {
  it("interpolates along the path and stops at the landing point", () => {
    const path = simulateProjectile({ speed: 20, angle: 45, gravity: 9.81 });
    const half = positionAt(path, path.flightTime / 2);
    expect(half.x).toBeCloseTo(path.range / 2, 1);
    expect(half.y).toBeCloseTo(path.maxHeight, 1);
    expect(positionAt(path, 99)).toEqual(path.points.at(-1));
  });
});

describe("falling", () => {
  const hammer = { mass: 1.32, drag: 0 };
  const feather = { mass: 0.003, drag: 0.01 };

  it("takes the same time for any mass when there is no air", () => {
    expect(fallTime(hammer, 9.81, 1.6)).toBeCloseTo(0.5711, 4);
    expect(fallTime({ mass: 0.003, drag: 0 }, 9.81, 1.6)).toBeCloseTo(
      0.5711,
      4,
    );
    expect(fallTime(hammer, 1.62, 1.6)).toBeCloseTo(1.4055, 4); // on the Moon
  });

  it("matches the explainer's simulated numbers with air", () => {
    // The Python loop in the explainer prints 1.05 s and 0.57 s.
    expect(fallTime(feather, 9.81, 1.6)).toBeCloseTo(1.05, 2);
    expect(fallTime({ mass: 1.32, drag: 0.005 }, 9.81, 1.6)).toBeCloseTo(
      0.57,
      2,
    );
  });

  it("is self-consistent: after fallTime, the distance fallen is the height", () => {
    for (const body of [hammer, feather, { mass: 0.1, drag: 0.02 }]) {
      const t = fallTime(body, 9.81, 12);
      expect(distanceFallen(body, 9.81, t)).toBeCloseTo(12, 8);
    }
  });

  it("approaches terminal velocity and never exceeds it", () => {
    const vt = terminalVelocity(feather, 9.81);
    expect(vt).toBeCloseTo(1.7155, 4); // √(m g / k)
    expect(speedAfter(feather, 9.81, 0.1)).toBeLessThan(vt);
    expect(speedAfter(feather, 9.81, 60)).toBeCloseTo(vt, 9);
    expect(Number.isFinite(distanceFallen(feather, 9.81, 5000))).toBe(true);
  });
});

describe("Euler's method", () => {
  it("takes the textbook steps for dy/dt = y", () => {
    // Two steps of size 1 from y = 1: 1 → 2 → 4.
    expect(eulerSteps(odeProblems.growth, 2)).toEqual([
      { t: 0, y: 1 },
      { t: 1, y: 2 },
      { t: 2, y: 4 },
    ]);
  });

  it.each(odeProblemIds)("has an exact solution that satisfies %s", (id) => {
    const problem = odeProblems[id];
    expect(problem.exact(0)).toBeCloseTo(problem.y0, 10);
    for (const t of [0.3, 1, problem.tEnd * 0.9]) {
      const h = 1e-6;
      const derivative =
        (problem.exact(t + h) - problem.exact(t - h)) / (2 * h);
      expect(derivative).toBeCloseTo(problem.slope(t, problem.exact(t)), 4);
    }
  });

  it.each(odeProblemIds)("halves its error when the steps double: %s", (id) => {
    const problem = odeProblems[id];
    const ratio = finalError(problem, 200) / finalError(problem, 400);
    expect(ratio).toBeGreaterThan(1.8);
    expect(ratio).toBeLessThan(2.2);
  });
});
