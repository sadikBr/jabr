import { paramValues } from "@/lib/content/parametrised";
import type { ParamSpec } from "@/lib/content/types";

import { createRandom, hashString, MAX_SEED } from "./prng";

/**
 * The seed a question starts with. It depends only on the question, so the
 * prerendered page and the grader agree without any stored state.
 */
export function defaultSeed(questionId: string): number {
  return hashString(questionId) % MAX_SEED;
}

/** Picks one value per parameter. The same seed always gives the same values. */
export function pickParams(
  params: Record<string, ParamSpec>,
  seed: number,
): Record<string, number> {
  const random = createRandom(seed);
  const picked: Record<string, number> = {};
  // Sorted so the result does not depend on key order in the YAML.
  for (const name of Object.keys(params).sort()) {
    const values = paramValues(params[name]!);
    picked[name] = values[Math.floor(random() * values.length)]!;
  }
  return picked;
}

/** Replaces `{name}` placeholders with parameter values. */
export function fillPlaceholders(
  text: string,
  values: Record<string, number>,
): string {
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
    text,
  );
}
