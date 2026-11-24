import { describe, expect, it } from "vitest";

import { allPrerequisites, dependentsOf, findPrerequisiteCycle } from "./graph";
import type { Concept } from "./types";

const c = (id: string, prerequisites: string[] = []): Concept => ({
  id,
  title: id,
  subject: "maths",
  summary: id,
  prerequisites,
});

const chain = [c("a"), c("b", ["a"]), c("c", ["b"]), c("d", ["a", "c"])];

describe("findPrerequisiteCycle", () => {
  it("returns null for an acyclic graph, including diamonds", () => {
    expect(findPrerequisiteCycle(chain)).toBeNull();
  });

  it("finds a long cycle", () => {
    const cycle = findPrerequisiteCycle([
      c("a", ["c"]),
      c("b", ["a"]),
      c("c", ["b"]),
    ]);
    expect(cycle).toEqual(["a", "c", "b", "a"]);
  });

  it("ignores prerequisites that do not exist", () => {
    expect(findPrerequisiteCycle([c("a", ["ghost"])])).toBeNull();
  });
});

describe("allPrerequisites", () => {
  it("collects direct and indirect prerequisites once each", () => {
    expect(allPrerequisites(chain, "d").sort()).toEqual(["a", "b", "c"]);
    expect(allPrerequisites(chain, "a")).toEqual([]);
  });
});

describe("dependentsOf", () => {
  it("lists concepts that build directly on one", () => {
    expect(dependentsOf(chain, "a").map((x) => x.id)).toEqual(["b", "d"]);
  });
});
