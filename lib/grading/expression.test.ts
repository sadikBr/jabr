import { describe, expect, it } from "vitest";

import {
  compareExpressions,
  normaliseExpression,
  parseExpression,
} from "./expression";

function evaluate(input: string, values: Record<string, number> = {}) {
  const parsed = parseExpression(input, Object.keys(values));
  if (!parsed.ok) throw new Error(`${input}: ${parsed.error}`);
  return parsed.evaluate(values);
}

function equivalent(a: string, b: string, variables = ["x"]) {
  const expected = parseExpression(a, variables);
  const actual = parseExpression(b, variables);
  if (!expected.ok || !actual.ok) throw new Error("did not parse");
  return compareExpressions(expected.evaluate, actual.evaluate, variables);
}

describe("normaliseExpression", () => {
  it.each([
    ["2 − x", "2 - x"],
    ["3 × x ÷ 2", "3 * x / 2"],
    ["x**2", "x^2"],
    ["x² + x³", "x^2 + x^3"],
    ["x¹⁰", "x^10"],
    ["2π", "2pi"],
    ["√x", "sqrt(x)"],
    ["√(x+1)", "sqrt(x+1)"],
    ["3,5", "3.5"],
    ["f'(x) = 6x", "6x"],
    ["y = 2x", "2x"],
    ["= 4", "4"],
  ])("rewrites %s as %s", (input, expected) => {
    expect(normaliseExpression(input)).toBe(expected);
  });
});

describe("parseExpression", () => {
  it("understands implicit multiplication", () => {
    expect(evaluate("2x", { x: 3 })).toBe(6);
    expect(evaluate("2(x + 1)", { x: 3 })).toBe(8);
    expect(evaluate("x(x + 1)", { x: 3 })).toBe(12);
    expect(evaluate("3x^2", { x: 2 })).toBe(12);
    expect(evaluate("x y", { x: 2, y: 5 })).toBe(10);
  });

  it("knows constants and the allowed functions", () => {
    expect(evaluate("2pi")).toBeCloseTo(2 * Math.PI, 12);
    expect(evaluate("e^2")).toBeCloseTo(Math.E ** 2, 12);
    expect(evaluate("ln(e)")).toBeCloseTo(1, 12);
    expect(evaluate("sqrt(16) + abs(-2)")).toBe(6);
    expect(evaluate("sin(pi/2)")).toBeCloseTo(1, 12);
  });

  it("returns NaN where the expression is undefined", () => {
    expect(evaluate("sqrt(x)", { x: -1 })).toBeNaN();
    expect(Number.isFinite(evaluate("1/x", { x: 0 }))).toBe(false);
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["2 +", "syntax"],
    ["(x", "syntax"],
    ["sin x", "syntax"],
    ["y + 1", "unknown-symbol"],
    ["foo(x)", "unknown-function"],
    ["log(x)", "ambiguous-log"],
    ["x".repeat(201), "too-long"],
  ])("rejects %j as %s", (input, error) => {
    expect(parseExpression(input, ["x"])).toMatchObject({ ok: false, error });
  });

  it.each([
    "x = 5; x",
    "[1, 2, 3]",
    "import('fs')",
    "x.constructor",
    'evaluate("1")',
    "5 m",
    "x > 1 ? 1 : 2",
    "factorial(170)",
    "ones(1000, 1000)",
    "g(x, y) = x",
    '"text"',
    "true",
    "x!",
    "1:10",
  ])("refuses anything beyond plain arithmetic: %s", (input) => {
    expect(parseExpression(input, ["x"]).ok).toBe(false);
  });
});

describe("compareExpressions", () => {
  it.each([
    ["2(x+1)", "2x+2"],
    ["6x", "x*6"],
    ["6x", "3x + 3x"],
    ["x^2 - 1", "(x-1)(x+1)"],
    ["(x+1)^2", "x^2 + 2x + 1"],
    ["sin(x)^2 + cos(x)^2", "1"],
    ["1/(2 sqrt(x))", "x^(-1/2)/2"],
    ["e^(2x)", "exp(x)^2"],
    ["x/2", "0.5x"],
  ])("treats %s and %s as equal", (a, b) => {
    expect(equivalent(a, b)).toBe("equal");
  });

  it.each([
    ["6x", "6x + 0.0001"],
    ["6x", "3x"],
    ["6x", "6"],
    ["x^2", "2x"],
    ["x^2", "abs(x)^2 + 1"],
    ["sin(x)", "x"],
    ["x", "abs(x)"],
  ])("treats %s and %s as different", (a, b) => {
    expect(equivalent(a, b)).toBe("different");
  });

  it("skips points where the expected expression is undefined", () => {
    expect(equivalent("sqrt(x)", "x^(1/2)")).toBe("equal");
    expect(equivalent("ln(x)", "ln(x)")).toBe("equal");
  });

  it("says different when the answer is undefined where the expected one is not", () => {
    expect(equivalent("x", "sqrt(x)^2")).toBe("different");
  });

  it("handles several variables", () => {
    expect(equivalent("a*b + a", "a(b+1)", ["a", "b"])).toBe("equal");
    expect(equivalent("a*b", "a+b", ["a", "b"])).toBe("different");
  });

  it("is undetermined when the expected expression is defined nowhere", () => {
    expect(equivalent("sqrt(-1 - x^2)", "1")).toBe("undetermined");
  });
});
