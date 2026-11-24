import { describe, expect, it } from "vitest";

import {
  distanceAt,
  isContinuous,
  limitCaseIds,
  limitCases,
  twoSidedLimit,
} from "./limits";

describe("limitCases", () => {
  it.each(limitCaseIds)(
    "%s really approaches its stated one-sided limits",
    (id) => {
      const c = limitCases[id];
      const d = 1e-7;
      if (c.left !== null) expect(c.f(c.a - d)).toBeCloseTo(c.left, 5);
      if (c.right !== null) expect(c.f(c.a + d)).toBeCloseTo(c.right, 5);
    },
  );

  it("grows without bound in the blow-up case", () => {
    const { f, a } = limitCases["blow-up"];
    expect(f(a + 1e-3)).toBeGreaterThan(1e5);
    expect(f(a - 1e-3)).toBeGreaterThan(1e5);
  });

  it("keeps swinging in the oscillating case", () => {
    const { f } = limitCases.oscillating;
    // Peaks and troughs of sin(1/x), arbitrarily close to 0.
    expect(f(1 / (Math.PI / 2 + 2000 * Math.PI))).toBeCloseTo(1, 6);
    expect(f(1 / ((3 * Math.PI) / 2 + 2000 * Math.PI))).toBeCloseTo(-1, 6);
  });

  it("keeps the point of interest inside the view", () => {
    for (const id of limitCaseIds) {
      const c = limitCases[id];
      expect(c.a).toBeGreaterThan(c.x[0]);
      expect(c.a).toBeLessThan(c.x[1]);
    }
  });
});

describe("twoSidedLimit and isContinuous", () => {
  it("has a limit only when both sides agree", () => {
    expect(twoSidedLimit(limitCases.hole)).toBe(2);
    expect(twoSidedLimit(limitCases.jump)).toBeNull();
    expect(twoSidedLimit(limitCases["blow-up"])).toBeNull();
  });

  it("is continuous only when the limit equals the value", () => {
    expect(isContinuous(limitCases.smooth)).toBe(true);
    expect(isContinuous(limitCases.hole)).toBe(false);
    expect(isContinuous(limitCases["moved-point"])).toBe(false);
    expect(isContinuous(limitCases.jump)).toBe(false);
  });
});

describe("distanceAt", () => {
  it("steps down in powers of ten", () => {
    expect(distanceAt(0)).toBe(1);
    expect(distanceAt(1)).toBe(0.1);
    expect(distanceAt(4)).toBe(0.0001);
    expect(distanceAt(0.5)).toBe(0.316);
  });
});
