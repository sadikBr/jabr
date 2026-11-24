import { describe, expect, it } from "vitest";

import { evaluateAnswer, paramCombinations, paramValues } from "./parametrised";

describe("paramValues", () => {
  it("includes both ends of a range", () => {
    expect(paramValues({ min: 10, max: 30, step: 10 })).toEqual([10, 20, 30]);
  });

  it("avoids floating-point drift on fractional steps", () => {
    expect(paramValues({ min: 0, max: 0.3, step: 0.1 })).toEqual([
      0, 0.1, 0.2, 0.3,
    ]);
  });

  it("returns choices as given", () => {
    expect(paramValues({ choices: [30, 45, 60] })).toEqual([30, 45, 60]);
  });
});

describe("paramCombinations", () => {
  it("returns every combination", () => {
    expect(
      paramCombinations({
        v: { min: 1, max: 2, step: 1 },
        angle: { choices: [30, 60] },
      }),
    ).toEqual([
      { v: 1, angle: 30 },
      { v: 1, angle: 60 },
      { v: 2, angle: 30 },
      { v: 2, angle: 60 },
    ]);
  });
});

describe("evaluateAnswer", () => {
  it("evaluates a formula of the parameters, including units of angle", () => {
    // Projectile range: v² sin(2θ) / g
    expect(
      evaluateAnswer("v^2 * sin(2 * angle deg) / 9.81", { v: 20, angle: 45 }),
    ).toBeCloseTo(40.775, 3);
  });

  it("throws on unknown symbols and non-finite results", () => {
    expect(() => evaluateAnswer("2 * b", { a: 1 })).toThrow();
    expect(() => evaluateAnswer("1 / a", { a: 0 })).toThrow(/finite/);
  });
});
