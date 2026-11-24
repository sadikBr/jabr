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
  [Id in InteractiveId]: ComponentType<InteractiveProps<Id>>;
} = {
  "tangent-zoom": dynamic(() =>
    import("./tangent-zoom").then((module) => module.TangentZoom),
  ),
};

/** Renders the interactive with the given id. Props are validated on the server. */
export function InteractiveHost({
  id,
  props,
}: {
  id: InteractiveId;
  props: InteractiveProps<InteractiveId>;
}) {
  const Component = interactiveComponents[id];
  return <Component {...props} />;
}
