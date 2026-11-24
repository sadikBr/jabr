import { evaluate } from "mathjs";

import type { ParamSpec } from "./types";

/** Every value a parameter can take, in order. */
export function paramValues(spec: ParamSpec): number[] {
  if ("choices" in spec) return spec.choices;
  const count = Math.floor((spec.max - spec.min) / spec.step + 1e-9) + 1;
  return Array.from({ length: Math.max(count, 0) }, (_, i) =>
    // Round away floating-point drift such as 0.1 + 0.2.
    Number((spec.min + i * spec.step).toPrecision(12)),
  );
}

/** Every combination of parameter values. */
export function paramCombinations(
  params: Record<string, ParamSpec>,
): Record<string, number>[] {
  return Object.entries(params).reduce<Record<string, number>[]>(
    (combinations, [name, spec]) =>
      combinations.flatMap((combination) =>
        paramValues(spec).map((value) => ({ ...combination, [name]: value })),
      ),
    [{}],
  );
}

/**
 * Evaluates an answer formula for one set of parameter values.
 * Throws if the formula is invalid or the result is not a finite number.
 */
export function evaluateAnswer(
  formula: string,
  values: Record<string, number>,
): number {
  const result: unknown = evaluate(formula, { ...values });
  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error(`result is not a finite number (${String(result)})`);
  }
  return result;
}

/**
 * Adds the derived values to a set of parameter values. Each formula may use
 * the parameters and the derived values declared before it. Results are
 * rounded to ten significant figures so they read cleanly in a prompt.
 */
export function withDerived(
  values: Record<string, number>,
  derived: Record<string, string>,
): Record<string, number> {
  const all = { ...values };
  for (const [name, formula] of Object.entries(derived)) {
    all[name] = Number(evaluateAnswer(formula, all).toPrecision(10));
  }
  return all;
}

/** Names used as `{name}` placeholders in a prompt, hint or solution. */
export function placeholders(text: string, paramNames: string[]): string[] {
  return paramNames.filter((name) => text.includes(`{${name}}`));
}
