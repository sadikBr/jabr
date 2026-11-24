import type { Concept } from "./types";

/**
 * Finds a cycle in the prerequisite graph, as the list of concept ids going
 * round it (first id repeated at the end), or null when there is none.
 * Prerequisites that do not exist are ignored; the validator reports those.
 */
export function findPrerequisiteCycle(concepts: Concept[]): string[] | null {
  const byId = new Map(concepts.map((concept) => [concept.id, concept]));
  const state = new Map<string, "visiting" | "done">();
  const path: string[] = [];

  function visit(id: string): string[] | null {
    if (state.get(id) === "done") return null;
    if (state.get(id) === "visiting") {
      return [...path.slice(path.indexOf(id)), id];
    }
    state.set(id, "visiting");
    path.push(id);
    for (const prerequisite of byId.get(id)?.prerequisites ?? []) {
      if (!byId.has(prerequisite)) continue;
      const cycle = visit(prerequisite);
      if (cycle) return cycle;
    }
    path.pop();
    state.set(id, "done");
    return null;
  }

  for (const concept of concepts) {
    const cycle = visit(concept.id);
    if (cycle) return cycle;
  }
  return null;
}

/** Concepts that list `id` as a direct prerequisite. */
export function dependentsOf(concepts: Concept[], id: string): Concept[] {
  return concepts.filter((concept) => concept.prerequisites.includes(id));
}

/** Every concept `id` depends on, directly or not, nearest first. */
export function allPrerequisites(concepts: Concept[], id: string): string[] {
  const byId = new Map(concepts.map((concept) => [concept.id, concept]));
  const seen = new Set<string>();
  const queue = [...(byId.get(id)?.prerequisites ?? [])];
  while (queue.length > 0) {
    const next = queue.shift()!;
    if (seen.has(next) || next === id) continue;
    seen.add(next);
    queue.push(...(byId.get(next)?.prerequisites ?? []));
  }
  return [...seen];
}
