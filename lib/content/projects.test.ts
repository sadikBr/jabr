import { describe, expect, it } from "vitest";

import {
  milestoneHref,
  projectHref,
  projectMilestones,
  projectMinutes,
} from "./projects";
import type { ContentBundle, Milestone, Project } from "./types";

const refs = {
  components: [],
  steps: [],
  layers: [],
  interactives: [],
  questions: [],
  codeLabs: [],
  connections: [],
};
const milestone = (id: string, minutes?: number): Milestone => ({
  id,
  key: `rocket/${id}`,
  project: "rocket",
  title: id,
  summary: "",
  requires: [],
  check: "q",
  estimatedMinutes: minutes,
  body: "",
  refs,
});
const project: Project = {
  id: "rocket",
  title: "Rocket",
  summary: "",
  subjects: ["physics"],
  kind: "capstone",
  concepts: [],
  milestones: ["first", "second", "ghost"],
  status: "ready",
};
const content = {
  // Out of order on purpose: project.yaml decides the order.
  milestones: [
    milestone("second", 20),
    milestone("first", 10),
    { ...milestone("first"), key: "other/first", project: "other" },
  ],
} as unknown as ContentBundle;

describe("projectMilestones", () => {
  it("returns a project's own milestones in the listed order, skipping missing ones", () => {
    expect(projectMilestones(content, project).map((m) => m.key)).toEqual([
      "rocket/first",
      "rocket/second",
    ]);
  });
});

describe("links", () => {
  it("sends a written project to its page and an unwritten one to the list", () => {
    expect(projectHref(project)).toBe("/projects/rocket");
    expect(projectHref({ id: "rocket", status: "coming-soon" })).toBe(
      "/projects#rocket",
    );
    expect(milestoneHref(milestone("first"))).toBe("/projects/rocket/first");
  });
});

describe("projectMinutes", () => {
  it("adds up the milestones' estimates", () => {
    expect(projectMinutes(projectMilestones(content, project))).toBe(30);
    expect(projectMinutes([milestone("x")])).toBe(0);
  });
});
