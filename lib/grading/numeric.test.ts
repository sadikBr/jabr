import { describe, expect, it } from "vitest";

import { diagnoseNumber, parseNumber, withinTolerance } from "./numeric";

describe("parseNumber", () => {
  it.each([
    ["42", 42],
    [" -3.5 ", -3.5],
    ["−3.5", -3.5],
    ["3,5", 3.5],
    ["1/2", 0.5],
    ["2*3.5", 7],
    ["1.2e3", 1200],
    ["sqrt(16)", 4],
    ["2pi", 2 * Math.PI],
    ["= 7", 7],
    ["≈ 7", 7],
  ])("reads %j as %d", (input, expected) => {
    expect(parseNumber(input)).toEqual({ ok: true, value: expected });
  });

  it("drops the question's unit when the learner types it", () => {
    expect(parseNumber("12.5 m", "m")).toEqual({ ok: true, value: 12.5 });
    expect(parseNumber("12.5m", "m")).toEqual({ ok: true, value: 12.5 });
    expect(parseNumber("9.81 M/S", "m/s")).toEqual({ ok: true, value: 9.81 });
    expect(parseNumber("12.5", "m")).toEqual({ ok: true, value: 12.5 });
  });

  it.each([
    ["", "empty"],
    ["abc", "unknown-symbol"],
    ["12 km", "unknown-symbol"],
    ["1/0", "not-a-number"],
    ["2 +", "syntax"],
  ])("rejects %j", (input, error) => {
    expect(parseNumber(input)).toMatchObject({ ok: false, error });
  });
});

describe("withinTolerance", () => {
  it("accepts values up to and including an absolute tolerance", () => {
    const tolerance = { absolute: 0.1 };
    expect(withinTolerance(2.1, 2, tolerance)).toBe(true);
    expect(withinTolerance(1.9, 2, tolerance)).toBe(true);
    expect(withinTolerance(2.1000001, 2, tolerance)).toBe(false);
    expect(withinTolerance(1.8999999, 2, tolerance)).toBe(false);
  });

  it("accepts values up to and including a relative tolerance", () => {
    const tolerance = { relative: 0.02 };
    expect(withinTolerance(102, 100, tolerance)).toBe(true);
    expect(withinTolerance(98, 100, tolerance)).toBe(true);
    expect(withinTolerance(102.001, 100, tolerance)).toBe(false);
    expect(withinTolerance(-102, -100, tolerance)).toBe(true);
  });

  it("is not thrown by floating-point noise on the border", () => {
    // 0.1 + 0.2 is 0.30000000000000004
    expect(withinTolerance(0.1 + 0.2, 0.3, { absolute: 0 })).toBe(true);
    expect(withinTolerance(40.775 * 1.02, 40.775, { relative: 0.02 })).toBe(
      true,
    );
  });

  it("requires an exact answer when the tolerance is zero", () => {
    expect(withinTolerance(4, 4, { absolute: 0 })).toBe(true);
    expect(withinTolerance(4.001, 4, { absolute: 0 })).toBe(false);
  });

  it("a relative tolerance on zero accepts only zero", () => {
    expect(withinTolerance(0, 0, { relative: 0.05 })).toBe(true);
    expect(withinTolerance(0.001, 0, { relative: 0.05 })).toBe(false);
  });
});

describe("diagnoseNumber", () => {
  const tolerance = { relative: 0.01 };

  it("spots a sign error", () => {
    expect(diagnoseNumber(-9.81, 9.81, tolerance)).toBe("sign");
  });

  it("spots answers out by a power of ten (unit slips)", () => {
    expect(diagnoseNumber(4077.5, 40.775, tolerance)).toBe("power-of-ten");
    expect(diagnoseNumber(0.040775, 40.775, tolerance)).toBe("power-of-ten");
  });

  it("says nothing about answers that are simply wrong", () => {
    expect(diagnoseNumber(17, 40.775, tolerance)).toBeNull();
    expect(diagnoseNumber(5, 0, tolerance)).toBeNull();
  });
});
