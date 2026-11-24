import dagre from "@dagrejs/dagre";

import type { Concept } from "./types";
import type { Subject } from "./vocabulary";

/** Positions for drawing the concept graph, prerequisites above what they lead to. */

export const NODE_WIDTH = 184;
export const NODE_HEIGHT = 60;

export interface GraphLayout {
  nodes: {
    id: string;
    title: string;
    subject: Subject;
    /** Top-left corner. */
    x: number;
    y: number;
  }[];
  /** From a prerequisite to the concept that needs it. */
  edges: { source: string; target: string }[];
  width: number;
  height: number;
}

export function layoutConceptGraph(concepts: Concept[]): GraphLayout {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: "TB",
    nodesep: 16,
    edgesep: 4,
    ranksep: 46,
    marginx: 16,
    marginy: 16,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  const ids = new Set(concepts.map((concept) => concept.id));
  for (const concept of concepts) {
    graph.setNode(concept.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  const edges = concepts.flatMap((concept) =>
    concept.prerequisites
      .filter((id) => ids.has(id))
      .map((source) => ({ source, target: concept.id })),
  );
  for (const { source, target } of edges) graph.setEdge(source, target);

  dagre.layout(graph);

  return {
    nodes: concepts.map((concept) => {
      const { x, y } = graph.node(concept.id);
      return {
        id: concept.id,
        title: concept.title,
        subject: concept.subject,
        x: Math.round(x - NODE_WIDTH / 2),
        y: Math.round(y - NODE_HEIGHT / 2),
      };
    }),
    edges,
    width: Math.ceil(graph.graph().width ?? 0),
    height: Math.ceil(graph.graph().height ?? 0),
  };
}
