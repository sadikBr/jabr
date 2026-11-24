import { describe, expect, it } from "vitest";

import {
  clamp,
  createScale,
  curveSegments,
  niceTicks,
  type PlotFrame,
  snap,
} from "./plot";

const frame: PlotFrame = {
  width: 120,
  height: 70,
  pad: { left: 10, right: 10, top: 10, bottom: 10 },
  x: [0, 10],
  y: [-5, 5],
};

describe("createScale", () => {
  const scale = createScale(frame);

  it("maps the corners of the graph to the corners of the frame", () => {
    expect(scale.toX(0)).toBe(10);
    expect(scale.toX(10)).toBe(110);
    expect(scale.toY(-5)).toBe(60);
    expect(scale.toY(5)).toBe(10);
  });

  it("maps screen positions back, staying inside the graph", () => {
    expect(scale.fromX(scale.toX(3.5))).toBeCloseTo(3.5);
    expect(scale.fromY(scale.toY(-2))).toBeCloseTo(-2);
    expect(scale.fromX(-50)).toBe(0);
    expect(scale.fromX(500)).toBe(10);
  });
});

describe("snap and clamp", () => {
  it("snaps to a step without floating-point crumbs", () => {
    expect(snap(0.30000000000000004, 0.1)).toBe(0.3);
    expect(snap(2.26, 0.25)).toBe(2.25);
  });

  it("clamps to a range", () => {
    expect(clamp(7, 0, 5)).toBe(5);
    expect(clamp(-1, 0, 5)).toBe(0);
  });
});

describe("niceTicks", () => {
  it("picks round steps", () => {
    expect(niceTicks(0, 10)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(niceTicks(-1, 1, 4)).toEqual([-1, -0.5, 0, 0.5, 1]);
    expect(niceTicks(0, 100, 4)).toEqual([0, 50, 100]);
  });

  it("only includes ticks inside the range", () => {
    expect(niceTicks(0.3, 3.2, 3)).toEqual([1, 2, 3]);
  });
});

describe("curveSegments", () => {
  it("draws a continuous function as one line", () => {
    const segments = curveSegments((x) => x - 5, frame, { samples: 10 });
    expect(segments).toHaveLength(1);
    expect(segments[0]!.split(" ")).toHaveLength(11);
    expect(segments[0]!.startsWith("10.0,60.0")).toBe(true);
  });

  it("breaks the line where the function is undefined", () => {
    const segments = curveSegments((x) => (x === 5 ? Number.NaN : 1), frame, {
      samples: 10,
    });
    expect(segments).toHaveLength(2);
  });

  it("breaks the line at an asymptote instead of joining its two sides", () => {
    const segments = curveSegments((x) => 1 / (x - 5.03), frame, {
      samples: 200,
    });
    expect(segments.length).toBeGreaterThanOrEqual(2);
  });

  it("breaks the line at a declared jump", () => {
    const segments = curveSegments((x) => (x < 4 ? 1 : 3), frame, {
      samples: 10,
      breaks: [4],
    });
    expect(segments).toHaveLength(2);
    // The right-hand piece starts at the jump itself.
    expect(segments[1]!.startsWith("50.0,")).toBe(true);
  });
});
