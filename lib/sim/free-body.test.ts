import { describe, expect, it } from "vitest";

import { angleOf, magnitude } from "@/lib/maths/vectors";

import {
  checkDiagram,
  forceIds,
  netForce,
  situationIds,
  situations,
} from "./free-body";

describe("situations", () => {
  it.each(situationIds)("%s has weight, and no 'force of motion'", (id) => {
    const { forces } = situations[id];
    expect(forces.weight).toMatchObject({ acts: true, angle: 270, size: 1 });
    expect(forces.motion.acts).toBe(false);
  });

  it("balances the forces on things that are not accelerating", () => {
    expect(magnitude(netForce(situations.book))).toBeCloseTo(0, 10);
    expect(magnitude(netForce(situations.skydiver))).toBeCloseTo(0, 10);
  });

  it("leaves the weight unbalanced on a falling ball", () => {
    const net = netForce(situations.ball);
    expect(magnitude(net)).toBeCloseTo(1, 10);
    expect(angleOf(net)).toBeCloseTo(270, 10);
  });

  it("leaves only the rope's pull on the sled", () => {
    const net = netForce(situations.sled);
    expect(net.x).toBeCloseTo(0.6, 10);
    expect(net.y).toBeCloseTo(0, 10);
  });

  it("gives a net force of g·sin(30°) down the slope on the ramp", () => {
    const net = netForce(situations.ramp);
    expect(magnitude(net)).toBeCloseTo(0.5, 10);
    // Down a slope that rises to the right at 30°.
    expect(angleOf(net)).toBeCloseTo(210, 8);
  });

  it("pushes the rocket upwards", () => {
    const net = netForce(situations.rocket);
    expect(net.x).toBeCloseTo(0, 10);
    expect(net.y).toBeCloseTo(0.6, 10);
  });
});

describe("checkDiagram", () => {
  it("accepts exactly the forces that act", () => {
    expect(checkDiagram(situations.book, ["normal", "weight"])).toEqual({
      correct: true,
      missing: [],
      extra: [],
    });
  });

  it("names what is missing and what should not be there", () => {
    expect(checkDiagram(situations.skydiver, ["weight", "motion"])).toEqual({
      correct: false,
      missing: ["drag"],
      extra: ["motion"],
    });
    expect(checkDiagram(situations.ball, [...forceIds]).extra).toHaveLength(6);
  });
});
