import { describe, expect, it } from "vitest";

import {
  brakingDistance,
  distanceAt,
  kmhToMs,
  msToKmh,
  outcome,
  speedAt,
  stoppingDistance,
  stoppingTime,
  thinkingDistance,
} from "./braking";

const stop = { speed: 20, reaction: 1, deceleration: 8 };

describe("an emergency stop", () => {
  it("splits into thinking and braking distances", () => {
    expect(thinkingDistance(stop)).toBe(20);
    expect(brakingDistance(stop)).toBe(25);
    expect(stoppingDistance(stop)).toBe(45);
    expect(stoppingTime(stop)).toBe(3.5);
  });

  it("needs four times the braking distance at twice the speed", () => {
    expect(brakingDistance({ ...stop, speed: 40 })).toBe(
      4 * brakingDistance(stop),
    );
  });

  it("follows the car through both stages", () => {
    expect(speedAt(stop, 0.5)).toBe(20);
    expect(speedAt(stop, 2)).toBe(12);
    expect(speedAt(stop, 10)).toBe(0);
    expect(distanceAt(stop, 0.5)).toBe(10);
    expect(distanceAt(stop, 2)).toBe(36); // 20 + 20·1 − ½·8·1²
    expect(distanceAt(stop, 3.5)).toBe(45);
    expect(distanceAt(stop, 10)).toBe(45); // it stays stopped
  });

  it("stops short of an obstacle that is far enough away", () => {
    expect(outcome(stop, 50)).toEqual({ stopped: true, margin: 5 });
  });

  it("hits a nearer obstacle while still braking", () => {
    const hit = outcome(stop, 36);
    expect(hit).toMatchObject({ stopped: false });
    if (!hit.stopped) {
      expect(hit.impactSpeed).toBeCloseTo(12, 10);
      expect(hit.time).toBeCloseTo(2, 10);
    }
  });

  it("hits a very near obstacle at full speed, before the brakes go on", () => {
    expect(outcome(stop, 10)).toEqual({
      stopped: false,
      impactSpeed: 20,
      time: 0.5,
    });
  });

  it("converts between km/h and m/s", () => {
    expect(kmhToMs(72)).toBeCloseTo(20, 10);
    expect(msToKmh(20)).toBeCloseTo(72, 10);
  });
});
