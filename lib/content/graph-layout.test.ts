import { describe, expect, it } from "vitest";

import { layoutConceptGraph } from "./graph-layout";
import {
  firstGroupThatFits,
  type GraphLayout,
  NODE_HEIGHT,
  NODE_WIDTH,
} from "./graph-view";
import type { Concept } from "./types";

const c = (id: string, prerequisites: string[] = []): Concept => ({
  id,
  title: id,
  subject: "maths",
  summary: "",
  prerequisites,
});

const concepts = [
  c("slope"),
  c("limit"),
  c("derivative", ["slope", "limit"]),
  c("power-rule", ["derivative"]),
  c("velocity", ["derivative", "ghost"]),
];

describe("layoutConceptGraph", () => {
  const layout = layoutConceptGraph(concepts);
  const node = (id: string) => layout.nodes.find((n) => n.id === id)!;

  it("places every concept, with an edge per known prerequisite", () => {
    expect(layout.nodes.map((n) => n.id)).toEqual(concepts.map((x) => x.id));
    expect(layout.edges).toEqual([
      { source: "slope", target: "derivative" },
      { source: "limit", target: "derivative" },
      { source: "derivative", target: "power-rule" },
      { source: "derivative", target: "velocity" },
    ]);
  });

  it("puts prerequisites above the concepts that need them", () => {
    for (const { source, target } of layout.edges) {
      expect(node(source).y + NODE_HEIGHT).toBeLessThanOrEqual(node(target).y);
    }
  });

  it("does not overlap any two nodes, and fits inside its bounds", () => {
    for (const a of layout.nodes) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x + NODE_WIDTH).toBeLessThanOrEqual(layout.width);
      expect(a.y + NODE_HEIGHT).toBeLessThanOrEqual(layout.height);
      for (const b of layout.nodes) {
        if (a === b) continue;
        const apart =
          Math.abs(a.x - b.x) >= NODE_WIDTH ||
          Math.abs(a.y - b.y) >= NODE_HEIGHT;
        expect(apart, `${a.id} overlaps ${b.id}`).toBe(true);
      }
    }
  });

  it("gives the same layout every time", () => {
    expect(layoutConceptGraph(concepts)).toEqual(layout);
  });
});

describe("firstGroupThatFits", () => {
  // Three nodes in a row, 300 apart, and one far below.
  const at = (id: string, x: number, y: number) => ({
    id,
    title: id,
    subject: "maths" as const,
    x,
    y,
  });
  const layout: GraphLayout = {
    nodes: [at("a", 0, 0), at("b", 300, 0), at("c", 600, 0), at("d", 0, 900)],
    edges: [],
    width: 800,
    height: 1000,
  };
  const groups = [["a", "b", "c", "d"], ["a", "b", "c"], ["a", "b"], ["a"]];

  it("takes the most generous group that fits the view", () => {
    // a to c spans 600 + one node's width.
    expect(
      firstGroupThatFits(layout, groups, { width: 800, height: 400 }, 1),
    ).toEqual(["a", "b", "c"]);
    expect(
      firstGroupThatFits(layout, groups, { width: 500, height: 400 }, 1),
    ).toEqual(["a", "b"]);
    expect(
      firstGroupThatFits(layout, groups, { width: 800, height: 1000 }, 1),
    ).toEqual(["a", "b", "c", "d"]);
  });

  it("fits more when zoomed out, and less with padding", () => {
    const view = { width: 500, height: 400 };
    expect(firstGroupThatFits(layout, groups, view, 0.6)).toEqual([
      "a",
      "b",
      "c",
    ]);
    // 600 + 184 = 784 wide; at zoom 0.6 the view shows 833, but only 667
    // of it once a tenth is kept clear on each side.
    expect(firstGroupThatFits(layout, groups, view, 0.6, 0.1)).toEqual([
      "a",
      "b",
    ]);
  });

  it("falls back to the last group when nothing fits", () => {
    expect(
      firstGroupThatFits(layout, groups, { width: 100, height: 40 }, 1),
    ).toEqual(["a"]);
    expect(
      firstGroupThatFits(layout, [], { width: 100, height: 40 }, 1),
    ).toEqual([]);
  });
});

describe("the real concept graph", () => {
  it("lays out every concept without overlaps", async () => {
    const { content } = await import("./source");
    const layout = layoutConceptGraph(content.concepts);
    expect(layout.nodes).toHaveLength(content.concepts.length);
    for (const a of layout.nodes) {
      for (const b of layout.nodes) {
        if (a === b) continue;
        expect(
          Math.abs(a.x - b.x) >= NODE_WIDTH ||
            Math.abs(a.y - b.y) >= NODE_HEIGHT,
          `${a.id} overlaps ${b.id}`,
        ).toBe(true);
      }
    }
  });
});
