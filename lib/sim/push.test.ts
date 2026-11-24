import { describe, expect, it } from "vitest";

import {
  coastAcceleration,
  distanceAt,
  G,
  pushAcceleration,
  releaseSpeed,
  speedAt,
} from "./push";

describe("a push on a frictionless surface", () => {
  const push = { mass: 4, force: 12, duration: 2 };

  it("accelerates at force over mass", () => {
    expect(pushAcceleration(push)).toBe(3);
    expect(pushAcceleration({ ...push, mass: 8 })).toBe(1.5);
    expect(pushAcceleration({ ...push, force: 24 })).toBe(6);
  });

  it("keeps its speed for ever once the push ends", () => {
    expect(releaseSpeed(push)).toBe(6);
    expect(coastAcceleration(push)).toBe(0);
    expect(speedAt(push, 1)).toBe(3);
    expect(speedAt(push, 2)).toBe(6);
    expect(speedAt(push, 100)).toBe(6);
  });

  it("covers ½at² during the push, then steady distance each second", () => {
    expect(distanceAt(push, 2)).toBe(6);
    expect(distanceAt(push, 3)).toBe(12);
    expect(distanceAt(push, 4)).toBe(18);
  });
});

describe("a push with friction", () => {
  const push = { mass: 2, force: 10, duration: 1, friction: 0.2 };

  it("loses some of the force to friction", () => {
    expect(pushAcceleration(push)).toBeCloseTo((10 - 0.2 * 2 * G) / 2, 10);
  });

  it("does not move if the push cannot beat friction", () => {
    expect(pushAcceleration({ ...push, force: 3 })).toBe(0);
    expect(distanceAt({ ...push, force: 3 }, 5)).toBe(0);
  });

  it("slows down and stops after the push", () => {
    const v = releaseSpeed(push);
    const stopsAfter = v / (0.2 * G);
    expect(speedAt(push, 1 + stopsAfter / 2)).toBeCloseTo(v / 2, 10);
    expect(speedAt(push, 1 + stopsAfter + 1)).toBe(0);
    const final = distanceAt(push, 1 + stopsAfter);
    expect(distanceAt(push, 60)).toBeCloseTo(final, 10);
    expect(final).toBeCloseTo(0.5 * v * 1 + (v * v) / (2 * 0.2 * G), 10);
  });
});
