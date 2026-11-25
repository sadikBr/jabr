import { describe, expect, it } from "vitest";

import { defaultWorld, G, runLoop, trueFall } from "./game-loop";

describe("runLoop", () => {
  it("takes one frame per tick of the clock", () => {
    const { frames } = runLoop(60, false);
    expect(frames).toHaveLength(60 * defaultWorld.duration + 1);
    expect(frames[0]).toEqual({ t: 0, y: 5, v: 0 });
    expect(frames[60]!.t).toBeCloseTo(1, 10);
    // After one second of falling: close to, but not exactly, the true height.
    expect(frames[30]!.y).toBeCloseTo(trueFall(defaultWorld, 0.5), 0);
    expect(frames[30]!.v).toBeCloseTo(-G * 0.5, 10);
  });

  it("bounces on the platform at a high frame rate", () => {
    for (const fps of [30, 60, 120]) {
      const run = runLoop(fps, false);
      expect(run.fellThroughAt, `${fps} fps`).toBeNull();
      expect(run.bounces, `${fps} fps`).toBeGreaterThanOrEqual(3);
      // It never ends a frame below the platform's top.
      expect(Math.min(...run.frames.map((frame) => frame.y))).toBe(0);
    }
  });

  it("falls straight through the platform at a low frame rate", () => {
    for (const fps of [10, 15]) {
      const run = runLoop(fps, false);
      expect(run.bounces, `${fps} fps`).toBe(0);
      expect(run.fellThroughAt, `${fps} fps`).toBeCloseTo(1, 1);
    }
  });

  it("can work for a while and then fail", () => {
    // The kind of bug that gets past testing: two good bounces, then gone.
    const run = runLoop(20, false);
    expect(run.bounces).toBe(2);
    expect(run.fellThroughAt).toBeCloseTo(3.75, 2);
  });

  it("never falls through when the path between frames is checked", () => {
    for (const fps of [10, 15, 20, 30, 60]) {
      const run = runLoop(fps, true);
      expect(run.fellThroughAt, `${fps} fps`).toBeNull();
      expect(run.bounces, `${fps} fps`).toBeGreaterThanOrEqual(3);
    }
  });

  it("stops following a ball that has fallen out of the world", () => {
    const { frames } = runLoop(10, false);
    const last = frames[frames.length - 1]!;
    expect(last.y).toBeLessThan(-4);
    expect(last.t).toBeLessThan(defaultWorld.duration);
  });

  it("loses height with every bounce", () => {
    const { frames } = runLoop(120, false);
    // The highest point after the first bounce is about 0.8² of the drop.
    const firstBounce = frames.findIndex((frame) => frame.v > 0);
    const after = Math.max(...frames.slice(firstBounce).map((f) => f.y));
    expect(after).toBeGreaterThan(2.9);
    expect(after).toBeLessThan(3.4);
  });
});
