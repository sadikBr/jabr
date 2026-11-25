import { describe, expect, it } from "vitest";

import {
  circularSpeed,
  EARTH_RADIUS,
  escapeSpeed,
  fly,
  orbitalPeriod,
} from "./orbit";

const ISS = 400; // km

describe("orbital speeds", () => {
  it("matches the Space Station's speed and period", () => {
    expect(circularSpeed(ISS)).toBeCloseTo(7.67, 2);
    expect(orbitalPeriod(EARTH_RADIUS + ISS) / 60).toBeCloseTo(92.4, 1);
  });

  it("gives the well-known figures at the surface", () => {
    expect(circularSpeed(0)).toBeCloseTo(7.91, 2);
    expect(escapeSpeed(0)).toBeCloseTo(11.19, 2);
  });

  it("puts a geostationary satellite once round a day", () => {
    expect(orbitalPeriod(42_164) / 3600).toBeCloseTo(23.93, 1);
  });
});

describe("fly", () => {
  it("drops straight down when it is not moving", () => {
    const { outcome, points } = fly(0, ISS);
    expect(outcome).toMatchObject({ kind: "crash" });
    if (outcome.kind === "crash") {
      expect(outcome.groundDistance).toBeCloseTo(0, 6);
      // About five minutes to fall 400 km.
      expect(outcome.time / 60).toBeGreaterThan(4.5);
      expect(outcome.time / 60).toBeLessThan(5.5);
    }
    const last = points[points.length - 1]!;
    expect(Math.hypot(last.x, last.y)).toBeCloseTo(EARTH_RADIUS, 6);
  });

  it("lands further away the faster it is fired", () => {
    const distance = (speed: number) => {
      const { outcome } = fly(speed, ISS);
      return outcome.kind === "crash" ? outcome.groundDistance : Infinity;
    };
    expect(distance(2)).toBeGreaterThan(500);
    expect(distance(5)).toBeGreaterThan(distance(2));
    expect(distance(7)).toBeGreaterThan(distance(5));
    expect(distance(7.6)).toBe(Infinity);
  });

  it("goes round in a circle at exactly the circular speed", () => {
    const { outcome, points } = fly(circularSpeed(ISS), ISS);
    expect(outcome).toMatchObject({ kind: "orbit" });
    if (outcome.kind === "orbit") {
      expect(outcome.lowest).toBeCloseTo(ISS, 3);
      expect(outcome.highest).toBeCloseTo(ISS, 3);
      expect(outcome.period / 60).toBeCloseTo(92.4, 1);
    }
    // Every point of the path is at the same height…
    for (const point of points) {
      expect(Math.hypot(point.x, point.y) - EARTH_RADIUS).toBeCloseTo(ISS, 0);
    }
    // …and it comes back to where it started.
    const last = points[points.length - 1]!;
    expect(last.x).toBeCloseTo(0, -2);
    expect(last.y).toBeGreaterThan(0);
  });

  it("swings out and back when fired faster than that", () => {
    const { outcome } = fly(9, ISS);
    expect(outcome).toMatchObject({ kind: "orbit" });
    if (outcome.kind === "orbit") {
      expect(outcome.lowest).toBeCloseTo(ISS, 3);
      expect(outcome.highest).toBeGreaterThan(8000);
      expect(outcome.period).toBeGreaterThan(orbitalPeriod(EARTH_RADIUS + ISS));
    }
  });

  it("dips lower, but still misses the ground, just below the circular speed", () => {
    const { outcome } = fly(7.6, ISS);
    expect(outcome).toMatchObject({ kind: "orbit" });
    if (outcome.kind === "orbit") {
      expect(outcome.highest).toBeCloseTo(ISS, 3);
      expect(outcome.lowest).toBeGreaterThan(0);
      expect(outcome.lowest).toBeLessThan(ISS);
    }
  });

  it("never comes back at the escape speed or above", () => {
    expect(fly(escapeSpeed(ISS), ISS).outcome).toEqual({ kind: "escape" });
    expect(fly(12, ISS).outcome).toEqual({ kind: "escape" });
    expect(fly(escapeSpeed(ISS) - 0.1, ISS).outcome.kind).toBe("orbit");
  });
});
