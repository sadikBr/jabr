import { describe, expect, it } from "vitest";

import { plottableFunctions } from "@/lib/content/interactive-specs";

import { formatNumber, functionDefinitions, secantSlope } from "./functions";

describe("functionDefinitions", () => {
  it.each(plottableFunctions)(
    "has a derivative for %s that matches a numeric estimate",
    (name) => {
      const { f, derivative } = functionDefinitions[name];
      for (const x of [0.5, 1, 2.2]) {
        const estimate = (f(x + 1e-6) - f(x - 1e-6)) / 2e-6;
        expect(derivative(x)).toBeCloseTo(estimate, 5);
      }
    },
  );
});

describe("secantSlope", () => {
  it("gives 2x + h for x²", () => {
    const { f } = functionDefinitions["x^2"];
    expect(secantSlope(f, 1, 1)).toBeCloseTo(3, 10);
    expect(secantSlope(f, 1, 0.1)).toBeCloseTo(2.1, 10);
    expect(secantSlope(f, 1, 0.01)).toBeCloseTo(2.01, 10);
  });
});

describe("formatNumber", () => {
  it("trims trailing zeros and floating-point noise", () => {
    expect(formatNumber(2.1000000000000005)).toBe("2.1");
    expect(formatNumber(3)).toBe("3");
    expect(formatNumber(2.00049)).toBe("2.0005");
    expect(formatNumber(-0.00001)).toBe("0");
  });
});
