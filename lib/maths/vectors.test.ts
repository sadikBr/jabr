import { describe, expect, it } from "vitest";

import {
  add,
  angleBetween,
  angleOf,
  fromPolar,
  magnitude,
  scale,
  subtract,
  toPolar,
} from "./vectors";

describe("vectors", () => {
  it("splits a vector into components", () => {
    const v = fromPolar({ magnitude: 10, angle: 30 });
    expect(v.x).toBeCloseTo(8.6603, 4);
    expect(v.y).toBeCloseTo(5, 10);
    const down = fromPolar({ magnitude: 2, angle: 270 });
    expect(down.x).toBeCloseTo(0, 10);
    expect(down.y).toBeCloseTo(-2, 10);
  });

  it("adds, subtracts and scales component by component", () => {
    expect(add({ x: 1, y: 2 }, { x: 3, y: -5 })).toEqual({ x: 4, y: -3 });
    expect(subtract({ x: 1, y: 2 }, { x: 3, y: -5 })).toEqual({ x: -2, y: 7 });
    expect(scale({ x: 1, y: -2 }, 3)).toEqual({ x: 3, y: -6 });
  });

  it("finds size and direction from components", () => {
    expect(magnitude({ x: 3, y: 4 })).toBe(5);
    expect(angleOf({ x: 1, y: 1 })).toBeCloseTo(45, 10);
    expect(angleOf({ x: -1, y: 0 })).toBeCloseTo(180, 10);
    expect(angleOf({ x: 0, y: -2 })).toBeCloseTo(270, 10);
    expect(angleOf({ x: 0, y: 0 })).toBe(0);
  });

  it("round-trips between the two forms", () => {
    const polar = toPolar(fromPolar({ magnitude: 3, angle: 200 }));
    expect(polar.magnitude).toBeCloseTo(3, 10);
    expect(polar.angle).toBeCloseTo(200, 10);
  });

  it("rowing at 3 m/s against a 2 m/s current, straight across needs 41.8° upstream", () => {
    const upstream = (Math.asin(2 / 3) * 180) / Math.PI;
    const result = add(fromPolar({ magnitude: 3, angle: 90 + upstream }), {
      x: 2,
      y: 0,
    });
    expect(upstream).toBeCloseTo(41.81, 2);
    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(Math.sqrt(5), 10);
  });

  it("measures the angle between two directions the short way round", () => {
    expect(angleBetween(10, 350)).toBe(20);
    expect(angleBetween(90, 270)).toBe(180);
    expect(angleBetween(45, 45)).toBe(0);
  });
});
