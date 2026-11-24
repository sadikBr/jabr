import { describe, expect, it } from "vitest";

import { datasetIds, datasets, slopeBetween } from "./datasets";

describe("datasets", () => {
  it.each(datasetIds)("%s is in increasing order of x", (id) => {
    const { points } = datasets[id];
    for (let i = 1; i < points.length; i++) {
      expect(points[i]!.x).toBeGreaterThan(points[i - 1]!.x);
    }
  });

  it("has the sprint's well-known figures", () => {
    const { points } = datasets.sprint;
    const last = points[points.length - 1]!;
    expect(last).toEqual({ x: 9.58, y: 100 });
    expect(slopeBetween(points[0]!, last)).toBeCloseTo(10.44, 2);
    // Fastest 10 m: from 60 m to 70 m, in 0.81 s.
    const speeds = points
      .slice(1)
      .map((point, i) => slopeBetween(points[i]!, point));
    const fastest = Math.max(...speeds);
    expect(speeds.indexOf(fastest)).toBe(6);
    expect(fastest).toBeCloseTo(12.35, 2);
    // No other stretch between two marks reaches 12.3 m/s.
    let reaching = 0;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        if (slopeBetween(points[i]!, points[j]!) >= 12.3) reaching++;
      }
    }
    expect(reaching).toBe(1);
  });
});

describe("slopeBetween", () => {
  it("is rise over run, with its sign", () => {
    expect(slopeBetween({ x: 1, y: 2 }, { x: 3, y: 8 })).toBe(3);
    expect(slopeBetween({ x: 0, y: 5 }, { x: 2, y: 1 })).toBe(-2);
  });
});
