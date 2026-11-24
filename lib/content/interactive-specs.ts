import { z } from "zod";

import { datasetIds } from "@/lib/maths/datasets";
import { limitCaseIds } from "@/lib/maths/limits";
import { odeProblemIds } from "@/lib/sim/euler";
import { situationIds } from "@/lib/sim/free-body";

/**
 * Prop schemas for every interactive, keyed by id. Kept free of React so the
 * content validator can check `<Interactive id props>` usages at build time.
 * The components themselves are registered in components/interactives/registry.tsx.
 */

/** Functions an interactive can plot. Each has an exact derivative in lib/maths/functions.ts. */
export const plottableFunctions = [
  "x^2",
  "x^3",
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
  "secant-explorer": {
    title: "Secant explorer",
    props: z.strictObject({
      /** Plot measured data instead of a function. */
      dataset: z.enum(datasetIds).optional(),
      fn: z.enum(plottableFunctions).default("x^2"),
      /** The stretch of x shown, for a function. */
      domain: z.tuple([z.number(), z.number()]).default([0, 4]),
      /** How finely the two points move, for a function. */
      step: z.number().min(0.01).max(1).default(0.1),
      /** Where the two points start. With data, the nearest readings. */
      a: z.number().default(1),
      b: z.number().default(3),
      units: z.strictObject({ x: z.string(), y: z.string() }).optional(),
      /** "motion" words the readouts as time, distance and speed. */
      labels: z.enum(["generic", "motion"]).default("generic"),
      /** Goal mode: find two points whose slope is at least `min`. */
      goal: z.strictObject({ min: z.number() }).optional(),
    }),
  },
  "limit-explorer": {
    title: "Limit explorer",
    props: z.strictObject({
      /** The functions on offer. The first is shown to begin with. */
      cases: z.array(z.enum(limitCaseIds)).min(1).default(["hole"]),
      /** "continuity" adds the three-part test for continuity. */
      mode: z.enum(["limit", "continuity"]).default("limit"),
    }),
  },
  "derivative-explorer": {
    title: "Derivative tracer",
    props: z.strictObject({
      /** The functions on offer. The first is shown to begin with. */
      fns: z
        .array(z.enum(plottableFunctions))
        .min(1)
        .default(["x^2", "x^3", "sin(x)"]),
    }),
  },
  "motion-graphs": {
    title: "Throw a ball: motion graphs",
    props: z.strictObject({
      speed: z.number().int().min(5).max(25).default(15),
      /** Goal mode: stop the clock at the top of the flight. */
      goal: z.enum(["peak"]).optional(),
    }),
  },
  "vector-add": {
    title: "Vector workbench",
    props: z.strictObject({
      /** "add" puts two vectors tip to tail; "components" splits one into parts. */
      mode: z.enum(["add", "components"]).default("add"),
      a: z
        .strictObject({
          magnitude: z.number().min(0).max(5),
          angle: z.number().min(0).max(360),
        })
        .default({ magnitude: 3, angle: 30 }),
      b: z
        .strictObject({
          magnitude: z.number().min(0).max(3),
          angle: z.number().min(0).max(360),
        })
        .default({ magnitude: 2, angle: 120 }),
      /** Keeps the second vector fixed: a current the learner cannot change. */
      lockB: z.boolean().default(false),
      /** "boat" words it as rowing across a river with a current. */
      labels: z.enum(["generic", "boat"]).default("generic"),
      unit: z.string().optional(),
      /**
       * Goal mode. With `direction`, the result must point that way (in
       * degrees) to within `tolerance` degrees. With `x` and `y`, the vector's
       * components must match to within `tolerance`.
       */
      goal: z
        .union([
          z.strictObject({
            direction: z.number().min(0).max(360),
            tolerance: z.number().positive().max(20).default(2),
          }),
          z.strictObject({
            x: z.number(),
            y: z.number(),
            tolerance: z.number().positive().max(1).default(0.15),
          }),
        ])
        .optional(),
    }),
  },
  "braking-distance": {
    title: "Emergency stop",
    props: z.strictObject({
      /** Speed in km/h. */
      speed: z.number().int().min(20).max(130).multipleOf(5).default(50),
      /** The driver's reaction time, in seconds. */
      reaction: z.number().min(0.5).max(2.5).default(1),
      surface: z.enum(["dry", "wet", "icy"]).default("dry"),
      /** How far ahead the obstacle is, in metres. */
      obstacle: z.number().min(20).max(150).default(60),
      /** Goal mode: find the fastest speed that still stops in time. */
      goal: z.boolean().default(false),
    }),
  },
  "push-lab": {
    title: "Push lab",
    props: z.strictObject({
      /** Mass of the block, in kg. */
      mass: z.number().int().min(1).max(10).default(2),
      /** The pushing force, in N. */
      force: z.number().int().min(0).max(20).default(6),
      /** How long the push lasts, in s. */
      duration: z.number().min(0.5).max(3).multipleOf(0.5).default(2),
      surface: z.enum(["ice", "carpet"]).default("ice"),
      /** Goal mode: let go of the block at this speed, in m/s. */
      goal: z
        .strictObject({
          speed: z.number().positive(),
          tolerance: z.number().positive().default(0.05),
        })
        .optional(),
    }),
  },
  "free-body-builder": {
    title: "Free-body diagram builder",
    props: z.strictObject({
      /** The situations on offer. The first is shown to begin with. */
      situations: z
        .array(z.enum(situationIds))
        .min(1)
        .default(["book", "ball", "skydiver", "sled", "ramp", "rocket"]),
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
