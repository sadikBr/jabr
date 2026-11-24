import { describe, expect, it } from "vitest";

import { paramValues } from "@/lib/content/parametrised";
import type { ParamSpec } from "@/lib/content/types";

import {
  defaultSeed,
  fillPlaceholders,
  pickParams,
  questionValues,
} from "./params";

const params: Record<string, ParamSpec> = {
  v: { min: 10, max: 30, step: 1 },
  angle: { choices: [30, 45, 60] },
};

describe("pickParams", () => {
  it("gives the same values for the same seed", () => {
    expect(pickParams(params, 1234)).toEqual(pickParams(params, 1234));
  });

  it("does not depend on the order the parameters are written in", () => {
    const reordered = { angle: params.angle!, v: params.v! };
    expect(pickParams(reordered, 99)).toEqual(pickParams(params, 99));
  });

  it("only picks allowed values, and varies with the seed", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const { v, angle } = pickParams(params, seed);
      expect(paramValues(params.v!)).toContain(v);
      expect([30, 45, 60]).toContain(angle);
      seen.add(`${v}/${angle}`);
    }
    expect(seen.size).toBeGreaterThan(30);
  });
});

describe("defaultSeed", () => {
  it("is stable for a question and differs between questions", () => {
    expect(defaultSeed("calc.q1")).toBe(defaultSeed("calc.q1"));
    expect(defaultSeed("calc.q1")).not.toBe(defaultSeed("calc.q2"));
    expect(defaultSeed("calc.q1")).toBeLessThan(2147483647);
  });
});

describe("fillPlaceholders", () => {
  it("replaces every occurrence and leaves other braces alone", () => {
    expect(
      fillPlaceholders("$\\frac{{b}^2 - {a}^2}{{b} - {a}}$", { a: 2, b: 5 }),
    ).toBe("$\\frac{5^2 - 2^2}{5 - 2}$");
  });
});

describe("questionValues", () => {
  it("is the picked parameters plus the values derived from them", () => {
    const picked = pickParams(params, 5);
    expect(questionValues({ params, derived: { double: "2 * v" } }, 5)).toEqual(
      { ...picked, double: 2 * picked.v! },
    );
  });
});
