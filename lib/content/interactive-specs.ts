import { z } from "zod";

import { odeProblemIds } from "@/lib/sim/euler";

/**
 * Prop schemas for every interactive, keyed by id. Kept free of React so the
 * content validator can check `<Interactive id props>` usages at build time.
 * The components themselves are registered in components/interactives/registry.tsx.
 */

/** Functions an interactive can plot. Each has an exact derivative in lib/maths/functions.ts. */
export const plottableFunctions = [
  "x^2",
  "x^3 - x",
  "sin(x)",
  "sqrt(x)",
] as const;

export const interactiveSpecs = {
  "tangent-zoom": {
    title: "Tangent zoom",
    props: z.strictObject({
      fn: z.enum(plottableFunctions).default("x^2"),
      x0: z.number().min(-3).max(3).default(1),
    }),
  },
  "projectile-sim": {
    title: "Projectile launcher",
    props: z.strictObject({
      speed: z.number().int().min(5).max(30).default(20),
      angle: z.number().int().min(5).max(85).default(30),
      gravity: z.number().positive().max(30).default(9.81),
      /** Goal mode: land within `tolerance` metres of `target`. */
      goal: z
        .strictObject({
          target: z.number().min(10).max(95),
          tolerance: z.number().positive().max(10).default(1.5),
        })
        .optional(),
    }),
  },
  "drop-test": {
    title: "Hammer and feather drop",
    props: z.strictObject({
      place: z.enum(["moon", "earth"]).default("moon"),
      air: z.boolean().default(true),
    }),
  },
  "euler-stepper": {
    title: "Euler's method stepper",
    props: z.strictObject({
      problem: z.enum(odeProblemIds).default("growth"),
      steps: z.number().int().min(1).max(64).default(4),
      /** Goal mode: get the final error down to `maxError` or less. */
      goal: z.strictObject({ maxError: z.number().positive() }).optional(),
    }),
  },
} as const;

export type InteractiveId = keyof typeof interactiveSpecs;
export type InteractiveProps<Id extends InteractiveId> = z.infer<
  (typeof interactiveSpecs)[Id]["props"]
>;

export function isInteractiveId(id: string): id is InteractiveId {
  return Object.hasOwn(interactiveSpecs, id);
}

/** Returns null when the props are valid, otherwise a readable reason. */
export function checkInteractiveProps(
  id: InteractiveId,
  props: unknown,
): string | null {
  const result = interactiveSpecs[id].props.safeParse(props);
  if (result.success) return null;
  return result.error.issues
    .map((issue) => `${issue.path.join(".") || "props"}: ${issue.message}`)
    .join("; ");
}
