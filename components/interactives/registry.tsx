"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import type {
  InteractiveId,
  InteractiveProps,
} from "@/lib/content/interactive-specs";

/**
 * Maps interactive ids to lazy-loaded components. Prop schemas live in
 * lib/content/interactive-specs.ts so the content validator can use them
 * without importing React code. Adding an interactive means adding it to both.
 */
const interactiveComponents: {
  // Components may accept extra, server-rendered props beyond their spec.
  [Id in InteractiveId]: ComponentType<
    InteractiveProps<Id> & Record<string, unknown>
  >;
} = {
  "tangent-zoom": dynamic(() =>
    import("./tangent-zoom").then((module) => module.TangentZoom),
  ),
  "projectile-sim": dynamic(() =>
    import("./projectile-sim").then((module) => module.ProjectileSim),
  ),
  "drop-test": dynamic(() =>
    import("./drop-test").then((module) => module.DropTest),
  ),
  "euler-stepper": dynamic(() =>
    import("./euler-stepper").then((module) => module.EulerStepper),
  ),
  "secant-explorer": dynamic(() =>
    import("./secant-explorer").then((module) => module.SecantExplorer),
  ),
  "limit-explorer": dynamic(() =>
    import("./limit-explorer").then((module) => module.LimitExplorer),
  ),
  "derivative-explorer": dynamic(() =>
    import("./derivative-explorer").then((module) => module.DerivativeExplorer),
  ),
  "motion-graphs": dynamic(() =>
    import("./motion-graphs").then((module) => module.MotionGraphs),
  ),
  "vector-add": dynamic(() =>
    import("./vector-add").then((module) => module.VectorAdd),
  ),
  "braking-distance": dynamic(() =>
    import("./braking-distance").then((module) => module.BrakingDistance),
  ),
  "push-lab": dynamic(() =>
    import("./push-lab").then((module) => module.PushLab),
  ),
  "free-body-builder": dynamic(() =>
    import("./free-body-builder").then((module) => module.FreeBodyBuilder),
  ),
};

/**
 * Renders the interactive with the given id. Props were validated against
 * the spec on the server, which may also add server-rendered extras.
 */
export function InteractiveHost({
  id,
  props,
}: {
  id: InteractiveId;
  props: Record<string, unknown>;
}) {
  const Component = interactiveComponents[id] as ComponentType<
    Record<string, unknown>
  >;
  return <Component {...props} />;
}
