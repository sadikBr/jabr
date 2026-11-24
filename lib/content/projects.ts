import type { ContentBundle, Milestone, Project } from "./types";

/** Pure lookups for projects and their milestones. */

export function projectHref(project: Pick<Project, "id" | "status">): string {
  // A project that is not written yet has no page of its own.
  return project.status === "ready"
    ? `/projects/${project.id}`
    : `/projects#${project.id}`;
}

export function milestoneHref(milestone: Pick<Milestone, "key">): string {
  return `/projects/${milestone.key}`;
}

/** A project's milestones, in the order its project.yaml lists them. */
export function projectMilestones(
  content: ContentBundle,
  project: Project,
): Milestone[] {
  const byKey = new Map(content.milestones.map((m) => [m.key, m]));
  return project.milestones
    .map((id) => byKey.get(`${project.id}/${id}`))
    .filter((milestone): milestone is Milestone => !!milestone);
}

export function getMilestone(content: ContentBundle, key: string) {
  return content.milestones.find((milestone) => milestone.key === key);
}

/** Total estimated minutes for a project, or 0 if no milestone gives one. */
export function projectMinutes(milestones: Milestone[]): number {
  return milestones.reduce(
    (total, milestone) => total + (milestone.estimatedMinutes ?? 0),
    0,
  );
}
