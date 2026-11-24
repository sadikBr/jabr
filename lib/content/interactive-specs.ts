import { z } from "zod";

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
