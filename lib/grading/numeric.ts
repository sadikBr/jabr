import type { Tolerance } from "@/lib/content/types";

import { type ExpressionErrorCode, parseExpression } from "./expression";

export type ParsedNumber =
  | { ok: true; value: number }
  | { ok: false; error: ExpressionErrorCode | "not-a-number" };

/**
 * Reads a number typed by a learner. Accepts decimals, a decimal comma,
 * scientific notation, simple arithmetic ("1/2", "2*3.5", "sqrt(2)") and an
 * optional trailing unit when the question has one.
 */
export function parseNumber(input: string, unit?: string): ParsedNumber {
  let text = input.trim();
  if (unit) {
    const lower = text.toLowerCase();
    if (lower.endsWith(unit.toLowerCase())) {
      text = text.slice(0, text.length - unit.length).trim();
    }
  }
  const parsed = parseExpression(text);
  if (!parsed.ok) return parsed;
  const value = parsed.evaluate({});
  return Number.isFinite(value)
    ? { ok: true, value }
    : { ok: false, error: "not-a-number" };
}

// Room for floating-point noise, so an answer exactly on the border counts.
const EPSILON = 1e-9;

export function withinTolerance(
  value: number,
  expected: number,
  tolerance: Tolerance,
): boolean {
  const allowed =
    "absolute" in tolerance
      ? tolerance.absolute
      : tolerance.relative * Math.abs(expected);
  const slack = EPSILON * Math.max(1, Math.abs(expected));
  return Math.abs(value - expected) <= allowed + slack;
}

export type NumericMistake = "sign" | "power-of-ten";

/** Spots wrong answers that are right except for a common slip. */
export function diagnoseNumber(
  value: number,
  expected: number,
  tolerance: Tolerance,
): NumericMistake | null {
  if (expected === 0 || value === 0) return null;
  if (withinTolerance(-value, expected, tolerance)) return "sign";
  for (const power of [1, 2, 3, 6, 9]) {
    for (const factor of [10 ** power, 10 ** -power]) {
      if (withinTolerance(value * factor, expected, tolerance)) {
        return "power-of-ten";
      }
    }
  }
  return null;
}
