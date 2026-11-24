import { describe, expect, it } from "vitest";

import {
  acceleration,
  flightTime,
  G,
  height,
  peakHeight,
  peakTime,
  velocity,
} from "./motion";

const thrown = { speed: 15 };

describe("a ball thrown straight up", () => {
  it("starts and lands on the ground", () => {
    expect(height(thrown, 0)).toBe(0);
    expect(height(thrown, flightTime(thrown))).toBeCloseTo(0, 9);
  });

  it("is momentarily at rest at the top", () => {
    expect(velocity(thrown, peakTime(thrown))).toBeCloseTo(0, 9);
    expect(peakHeight(thrown)).toBeCloseTo(15 ** 2 / (2 * G), 9);
  });

  it("lands as fast as it left, going the other way", () => {
    expect(velocity(thrown, flightTime(thrown))).toBeCloseTo(-15, 9);
  });

  it("has velocity as the slope of height, and acceleration as the slope of velocity", () => {
    const t = 0.7;
    const h = 1e-6;
    const slopeOfHeight =
      (height(thrown, t + h) - height(thrown, t - h)) / (2 * h);
    const slopeOfVelocity =
      (velocity(thrown, t + h) - velocity(thrown, t - h)) / (2 * h);
    expect(slopeOfHeight).toBeCloseTo(velocity(thrown, t), 5);
    expect(slopeOfVelocity).toBeCloseTo(acceleration(thrown), 5);
  });

  it("uses the gravity it is given", () => {
    expect(peakTime({ speed: 16.2, gravity: 1.62 })).toBeCloseTo(10, 9);
  });
});
