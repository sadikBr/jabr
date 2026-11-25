import type { Subject } from "./vocabulary";

/**
 * The shape of a laid-out concept graph, and what to show of it. Kept apart
 * from graph-layout.ts so the browser can use these without also loading the
 * layout library, which only the server needs.
 */

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

/**
 * Picks what to show when the whole graph is too big to read: the first of
 * `groups` whose nodes all fit in a view of the given size at `zoom`. Put the
 * most generous group first. If none fits, the last one is returned.
 */
export function firstGroupThatFits(
  layout: GraphLayout,
  groups: readonly string[][],
  view: { width: number; height: number },
  zoom: number,
  /** Space left around the nodes, as a share of the view on each side. */
  padding = 0,
): string[] {
  const usable = {
    width: (view.width * (1 - 2 * padding)) / zoom,
    height: (view.height * (1 - 2 * padding)) / zoom,
  };
  const fits = (ids: readonly string[]) => {
    const nodes = layout.nodes.filter((node) => ids.includes(node.id));
    if (nodes.length === 0) return false;
    const xs = nodes.map((node) => node.x);
    const ys = nodes.map((node) => node.y);
    return (
      Math.max(...xs) - Math.min(...xs) + NODE_WIDTH <= usable.width &&
      Math.max(...ys) - Math.min(...ys) + NODE_HEIGHT <= usable.height
    );
  };
  return groups.find(fits) ?? groups[groups.length - 1] ?? [];
}
