import { describe, expect, it } from "vitest";

import { layoutConceptGraph, NODE_HEIGHT, NODE_WIDTH } from "./graph-layout";
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
